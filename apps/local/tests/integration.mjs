import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {parseLesson,lessonParts,ProcessRunner,atomicWrite,removeOwned} from '../core.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
// The data root is unique per run on purpose: the single-instance lock is a named
// pipe derived from this path, so a fixed test root would collide with a real
// running instance (or another test run) and make the second launch abort — which
// is correct application behaviour, but a false failure for this fixture.
const home=await fs.mkdtemp(path.join(here,'test-data-'+randomBytes(6).toString('hex')+'-'));
const owner=randomUUID();await fs.writeFile(path.join(home,'.owner.json'),JSON.stringify({app:'vibe-learning-a1',owner}));
const children=[];
const startupLog=path.join(here,'startup-failure.log');
// A start-up failure must surface here, with the server's own output, instead of
// letting origin stay undefined and turning into ERR_INVALID_URL further on.
const failAt=(what,app,detail)=>new Error(what+'：'+(detail||'')+'\n--- 服务启动输出 ---\n'+(app?.getText()||'（没有输出）'));
async function launch(extra={},serverPath=path.join(here,'../server.mjs')){
  // A launch never reaps other apps: it runs while earlier subtests still hold
  // their own servers, and taking those down from here would break them.
  const child=spawn(process.execPath,[serverPath,'--no-open'],{env:{...process.env,LOCALAPPDATA:home,...extra},windowsHide:true});children.push(child);
  let text='';child.stdout.on('data',d=>text+=d);child.stderr.on('data',d=>text+=d);
  const closed=new Promise(r=>child.on('close',r));
  // A child that exits during start-up is returned, not thrown on: for the
  // single-instance case an immediate exit is the expected result, and the
  // caller's assertions are what judge it. Its captured output stays available
  // through getText(), so a genuine start-up failure is still diagnosable.
  const app={child,closed,getText:()=>text};
  live.push(app);
  for(let i=0;i<200;i++){
    const match=text.match(/http:\/\/127\.0\.0\.1:\d+\/#([a-f0-9]+)/);if(match){const u=new URL(match[0]);app.origin=u.origin;app.token=u.hash.slice(1);return app;}if(child.exitCode!==null)return app;await new Promise(r=>setTimeout(r,50));}
  throw failAt('服务启动超时（10 秒内没有输出版本地址，进程也未退出）',app);
}
// cache:'no-store' keeps undici from answering a repeated URL out of its own
// HTTP cache — a cached 200 would masquerade as the fresh request's result.
async function req(app,route,method='GET',body,headers={}){
  if(!app.origin)throw failAt('服务没有可用 address，无法请求 '+route,app);
  return fetch(app.origin+route,{method,cache:'no-store',headers:{'X-Vibe-Token':app.token,Origin:app.origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
}
async function state(app,levelId='level-01'){return (await req(app,'/api/state?levelId='+levelId)).json();}
async function ready(app){
  for(let i=0;i<200;i++){
    let s;try{s=await state(app);}catch(e){throw failAt('无法读取 /api/state：'+e.message,app);}
    if(s.environment.ready)return s;
    if(!s.environment.message.includes('正在检查')){
      // Environment probe failures are environmental, not silent: report the
      // server's message and its start-up output together.
      throw failAt('C++ 环境探测未通过：'+s.environment.message,app);
    }
    await new Promise(r=>setTimeout(r,100));
  }
  throw failAt('环境检测超时（20 秒）',app);
}
async function run(app,source,mode="run",levelId="level-01"){const s=await state(app,levelId);const response=await req(app,mode==='submit'?'/api/submit':'/api/run','POST',{levelId,source,revision:s.revision});assert.equal(response.status,202);const accepted=await response.json();for(let i=0;i<400;i++){const r=await (await req(app,'/api/run/'+accepted.runId)).json();if(r.finishedAt)return r;await new Promise(r=>setTimeout(r,100));}throw new Error('运行超时');}
async function shutdown(app){try{await req(app,'/api/shutdown','POST',{});}catch(e){app.shutdownError=e.message;}await app.closed;}
// A subtest that fails before its own shutdown() would otherwise leave its server
// holding the single-instance pipe, and every later launch in this run would then
// be refused by a still-correct application guard. Reap before the next launch so
// one failure cannot cascade into misleading ones.
const live=[];
async function reclaim(){
  for(const app of live.splice(0)){
    if(app.child.exitCode!==null)continue;
    // Bounded on purpose: a server that will not finish shutting down must not
    // hang the remaining cases on top of the failure that got us here.
    const closed=app.closed.catch(()=>{});
    try{await Promise.race([shutdown(app),new Promise(r=>setTimeout(r,8000))]);}catch(e){app.shutdownError=e.message;}
    await Promise.race([closed,new Promise(r=>setTimeout(r,3000))]);
    if(app.child.exitCode===null){try{app.child.kill();}catch{}}
  }
}
test('A1 real compiler and HTTP lifecycle',async t=>{
  // Whatever happens below, every instance started here hands the single-instance
  // lock back before the next test file runs. A subtest that throws (for example
  // ready() failing before its own shutdown) must not leave a server holding the
  // pipe, because the following launch would then be refused by a guard that is
  // working correctly — turning one failure into a cascade of misleading ones.
  t.after(reclaim);
  let app=await launch();let s=await ready(app);const initial=s.source;const red=initial.replace('255, 255, 255, 255','0, 0, 255, 255');
  await t.test('single instance',async()=>{
    const duplicate=await launch();assert.equal(await duplicate.closed,1);assert.match(duplicate.getText(),/已在运行/);
  });
  await t.test('access boundaries and answer withholding',async()=>{
    assert.equal((await req(app,'/api/state','GET',null,{'X-Vibe-Token':''})).status,403);
    assert.equal((await req(app,'/api/state','GET',null,{Origin:'https://example.org'})).status,403);
    // A raw client is required to forge the Host header. It also needs a fresh
    // connection and a unique URL: Node's HTTP agent keep-alive and undici's
    // cache both key on the URL alone, so a repeated request could be answered
    // from a previous connection/response and never reach the server with the
    // forged Host. The Host must differ from the app origin only in hostname
    // (same port), so the 403 can only come from the Host check.
    const wrongHostFor=hostname=>new Promise((resolve,reject)=>{
      const r=http.get(app.origin+'/api/state?host-check='+randomUUID(),{agent:false,headers:{Host:hostname+':'+new URL(app.origin).port,'X-Vibe-Token':app.token,Connection:'close'}},res=>{res.resume();resolve(res.statusCode);});
      r.on('error',reject);
    });
    assert.equal(await wrongHostFor('localhost'),403);
    assert.equal(await wrongHostFor('127.0.0.2'),403);
    assert.equal((await req(app,'/courses/tinyrenderer/level-01/reference.cpp')).status,404);
    assert.equal((await req(app,'/api/state?levelId=level-02')).status,403);
    assert.equal((await req(app,'/api/submit','POST',{levelId:'level-02',source:'int main(){}',revision:0})).status,403);
    assert.equal((await req(app,'/api/image/..%2F..%2Fstarter.cpp')).status,404);
    const raw=JSON.stringify(s.lesson);
    assert.ok(raw.includes('只学本题需要的 C++'));
    assert.ok(!raw.includes('完整代码见 `reference.cpp`'));
    assert.ok(!raw.includes('迁移练习：'));
    assert.ok(s.source.includes('int main()'));
    assert.equal(s.prefix,undefined);
    const r=await fetch(app.origin+'/api/state',{headers:{'X-Vibe-Token':app.token}});assert.equal(r.status,200);
    assert.equal((await fetch(app.origin+'/api/answer',{method:'POST',headers:{'X-Vibe-Token':app.token}})).status,403);
  });
  await t.test('white and red BMP, cache and run identity',async()=>{
    const white=await run(app,initial);assert.equal(white.status,'success',JSON.stringify(white));const wr=await req(app,white.image.url);assert.equal(wr.headers.get('cache-control'),'no-store');const b=Buffer.from(await wr.arrayBuffer());assert.deepEqual([...b.subarray(54+9*48+4*3,54+9*48+4*3+3)],[255,255,255]);
    const r=await run(app,red);assert.equal(r.status,'success',JSON.stringify(r));assert.equal(r.image.runId,r.runId);const rb=Buffer.from(await (await req(app,r.image.url)).arrayBuffer());assert.deepEqual([...rb.subarray(498,501)],[0,0,255]);assert.equal((await req(app,white.image.url)).status,200);assert.equal((await (await req(app,'/api/run/'+white.runId)).json()).status,'success');
  });
  await t.test('submit judges pixels and persists AC independently of answer views',async()=>{
    assert.equal((await run(app,initial)).judgment,null,'运行不判题');
    const white=await run(app,initial,'submit');assert.equal(white.judgment.verdict,'WA');
    const blue=red.replace('0, 0, 255, 255','255, 0, 0, 255');assert.equal((await run(app,blue,'submit')).judgment.verdict,'WA');
    const moved=red.replace('set(4, 6','set(6, 4');assert.equal((await run(app,moved,'submit')).judgment.verdict,'WA');
    const extra=red.replace('image.set(4, 6, color);','image.set(4, 6, color); image.set(0, 0, color);');assert.equal((await run(app,extra,'submit')).judgment.verdict,'WA');
    const alternate=red.replaceAll('image','canvas');assert.equal((await run(app,alternate,'submit')).judgment.verdict,'AC');
    assert.equal((await state(app)).passed,true);
    await req(app,'/api/answer','POST',{});assert.equal((await state(app)).passed,true);
    await run(app,blue,'submit');assert.equal((await state(app)).passed,true,'后续错误不撤销通过');
    const ce=await run(app,'invalid c++','submit');assert.equal(ce.judgment.verdict,'CE');assert.equal(ce.image,null);
  });
  await t.test('level 2: unlock, function judge, alternate implementation, isolation and timeout',async()=>{
    const second=await state(app,'level-02');assert.equal(second.progress['level-02'].unlocked,true);assert.equal(second.passed,false);
    const firstDraft=(await state(app)).source;
    const starter=second.source;
    const ref=await fs.readFile(path.join(here,'../../../courses/tinyrenderer/level-02/reference.cpp'),'utf8');
    assert.equal((await run(app,starter,'run','level-02')).judgment,null);
    assert.equal((await run(app,starter,'submit','level-02')).judgment.verdict,'WA');
    const ordinary=ref.replace('#ifndef COURSE_TEST','').replace('#endif','');
    let r=await run(app,ordinary,'submit','level-02');assert.equal(r.judgment.verdict,'AC',JSON.stringify(r));assert.equal(r.image,null);
    const alternate=`#include "output.h"
#include <algorithm>
#include <cstdlib>
void line(int a,int b,int c,int d,TGAImage& frame,TGAColor ink){
  int n=std::max(std::abs(c-a),std::abs(d-b));
  if(n==0){frame.set(a,b,ink);return;}
  for(int k=0;k<=n;k++)frame.set((2*(a*(n-k)+c*k)+n)/(2*n),(2*(b*(n-k)+d*k)+n)/(2*n),ink);
}
int main(){return 0;}`;
    assert.equal((await run(app,alternate,'submit','level-02')).judgment.verdict,'AC');
    assert.equal((await state(app)).source,firstDraft,'第二关不覆盖第一关');
    const hardcode=alternate.replace('int n=std::max(std::abs(c-a),std::abs(d-b));','a=2;b=3;c=10;d=7;int n=8;');
    assert.equal((await run(app,hardcode,'submit','level-02')).judgment.verdict,'WA');
    const dead=alternate.replace('int n=std::max','while(true){} int n=std::max');
    assert.equal((await run(app,dead,'submit','level-02')).judgment.verdict,'TLE');
    const early=alternate.replace('int n=std::max','std::exit(0); int n=std::max');
    assert.equal((await run(app,early,'submit','level-02')).judgment.verdict,'RE');
    assert.equal((await run(app,alternate.replace('void line(','void wrong('),'submit','level-02')).judgment.verdict,'CE');
    assert.equal((await run(app,alternate,'submit','level-02')).judgment.verdict,'AC');
    assert.equal((await state(app,'level-02')).passed,true);
  });
  await t.test('progress save failure preserves SE without inaccessible image',async()=>{
    const file=path.join(home,'VibeLearning/drafts/tinyrenderer/level-01/learning.json');
    await fs.rename(file,file+'.backup');await fs.mkdir(file);
    try{const r=await run(app,red,'submit');assert.equal(r.status,'system_error');assert.equal(r.judgment.verdict,'SE');assert.equal(r.image,null);assert.match(r.message,/进度保存失败/);}
    finally{await fs.rmdir(file);await fs.rename(file+'.backup',file);}
  });
  await t.test('normal main exit terminates descendants before reporting AC',async()=>{
    const marker=path.join(home,'descendant-marker.txt');
    const literal=JSON.stringify(marker).replaceAll('\\\\','/');
    const source=`#include "output.h"
#include <windows.h>
int main(int argc,char**) {
  if(argc>1){Sleep(2000);std::ofstream(${literal}) << "escaped";return 0;}
  TGAImage image(16,16,TGAImage::RGB);image.set(4,6,TGAColor{0,0,255,255});if(!save_preview(image))return 3;
  wchar_t exe[32768];GetModuleFileNameW(nullptr,exe,32768);std::wstring cmd=L"\\\"";cmd+=exe;cmd+=L"\\\" child";
  STARTUPINFOW si{};si.cb=sizeof(si);PROCESS_INFORMATION pi{};
  if(!CreateProcessW(exe,cmd.data(),nullptr,nullptr,FALSE,CREATE_NO_WINDOW,nullptr,nullptr,&si,&pi))return 4;
  CloseHandle(pi.hThread);CloseHandle(pi.hProcess);return 0;
}`;
    const r=await run(app,source,'submit');assert.equal(r.judgment.verdict,'AC',JSON.stringify(r));
    await shutdown(app);await new Promise(r=>setTimeout(r,2300));await assert.rejects(fs.stat(marker),{code:'ENOENT'});
    app=await launch();await ready(app);
  });
  await t.test('compile failure and recovery',async()=>{const r=await run(app,'    nonsense;\n');assert.equal(r.status,'compile_error');assert.equal(r.image,null);assert.ok(r.diagnostics.length);assert.equal((await run(app,red)).status,'success');});
  await t.test('nonzero exit',async()=>{const r=await run(app,red.replace('int main() {','int main() { return 7;'));assert.equal(r.status,'runtime_error');assert.equal(r.exitCode,7);assert.equal(r.image,null);});
  await t.test('execution timeout and recovery',async()=>{const r=await run(app,red.replace('int main() {','int main() { while(true) {}'));assert.equal(r.status,'timeout');assert.equal(r.phase,'execute');assert.equal(r.image,null);assert.equal((await run(app,red)).status,'success');});
  await t.test('missing and damaged output',async()=>{
    assert.equal((await run(app,red.replace('int main() {','int main() { return 0;'))).status,'output_error');
    const corrupt=red.replace('return save_preview(image) ? 0 : 1;', 'save_preview(image); std::ofstream("preview.bmp") << "bad"; return 0;');
    assert.equal((await run(app,corrupt)).status,'output_error');
  });
  await t.test('stale saves rejected and save failure preserves draft',async()=>{
    const old=await state(app);assert.equal((await req(app,'/api/draft','PUT',{source:red,revision:old.revision})).status,200);
    assert.equal((await req(app,'/api/draft','PUT',{source:initial,revision:old.revision})).status,409);
    const file=path.join(home,'VibeLearning/drafts/tinyrenderer/level-01/starter.cpp');await fs.rename(file,file+'.backup');await fs.mkdir(file);
    const before=await state(app);assert.equal((await req(app,'/api/draft','PUT',{source:initial,revision:before.revision})).status,500);
    await fs.rmdir(file);await fs.rename(file+'.backup',file);assert.match(await fs.readFile(file,'utf8'),/0, 0, 255, 255/);
  });
  await t.test('busy rejection and shutdown while executing',async()=>{
    const before=await state(app);const accepted=await req(app,'/api/run','POST',{source:red.replace('int main() {','int main() { while(true) {}'),revision:before.revision});assert.equal(accepted.status,202);
    assert.equal((await req(app,'/api/run','POST',{source:red,revision:before.revision+1})).status,409);
    // Restore the desired saved draft while the immutable run continues.
    const st=await state(app);assert.equal((await req(app,'/api/draft','PUT',{source:red,revision:st.revision})).status,200);
    await new Promise(r=>setTimeout(r,1500));await shutdown(app);assert.deepEqual(await fs.readdir(path.join(home,'VibeLearning/runs')),[]);
  });
  await t.test('restart restores saved code and answer flag',async()=>{app=await launch();s=await ready(app);assert.equal(s.source,red);const a=await req(app,'/api/answer','POST',{});assert.equal(a.status,200);assert.ok((await a.json()).code.includes('0, 0, 255, 255'));await shutdown(app);app=await launch();s=await ready(app);assert.equal(s.answerSeen,true);assert.equal(s.passed,true);assert.equal((await state(app,'level-02')).passed,true);await shutdown(app);});
  await t.test('missing compiler clear guidance',async()=>{app=await launch({VIBE_CPP:path.join(home,'absent.exe')});for(let i=0;i<50;i++){s=await state(app);if(s.environment.guidance)break;await new Promise(r=>setTimeout(r,100));}assert.equal(s.environment.ready,false);assert.match(s.environment.guidance,/MSYS2/);await shutdown(app);});
  await t.test('atomic session write does not overwrite hardlink target',async()=>{
    const isolated=path.join(home,'hardlink-session'),root=path.join(isolated,'VibeLearning');await fs.mkdir(root,{recursive:true});
    const external=path.join(home,'hardlink-evidence.txt');await fs.writeFile(external,'preserve outside target');
    await fs.link(external,path.join(root,'session.json'));
    const isolatedApp=await launch({LOCALAPPDATA:isolated});
    try{await ready(isolatedApp);assert.equal(await fs.readFile(external,'utf8'),'preserve outside target');}
    finally{await shutdown(isolatedApp);}
  });
  await t.test('LocalAppData path compiles, judges and kills descendants',async()=>{
    const appHome=await fs.mkdtemp(path.join(process.env.LOCALAPPDATA,'VibeLearningRegression-'));
    const isolated=await launch({LOCALAPPDATA:appHome});
    try{
      await ready(isolated);
      const accepted=await run(isolated,red,'submit');assert.equal(accepted.judgment.verdict,'AC',JSON.stringify(accepted));
      const broken=await run(isolated,'not c++','submit');assert.equal(broken.judgment.verdict,'CE');
      assert.equal((await run(isolated,red.replace('int main() {','int main() { while(true) {}'),'submit')).judgment.verdict,'TLE');
      assert.equal((await run(isolated,red,'submit')).judgment.verdict,'AC');
    }finally{await shutdown(isolated);}
    const saved=await fs.readFile(path.join(appHome,'VibeLearning/drafts/tinyrenderer/level-01/starter.cpp'),'utf8');assert.equal(saved,red);
    console.log('LocalAppData regression data retained at '+appHome);
  });
  await t.test('missing fixed dependency is SE, not CE',async()=>{
    const clone=path.join(home,'dependency-copy'),local=path.join(clone,'apps/local'),copiedCourse=path.join(clone,'courses/tinyrenderer');
    await fs.mkdir(path.join(local,'native'),{recursive:true});
    for(const file of ['server.mjs','core.mjs','native/job-control.node','native/worker.mjs'])await fs.copyFile(path.join(here,'..',file),path.join(local,file));
    for(const file of ['level-01/starter.cpp','level-01/lesson.md','upstream/tgaimage.cpp','upstream/tgaimage.h','support/output.h']){
      const dest=path.join(copiedCourse,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(here,'../../../courses/tinyrenderer',file),dest);
    }
    const isolatedApp=await launch({LOCALAPPDATA:path.join(home,'dependency-data')},path.join(local,'server.mjs'));
    try{await ready(isolatedApp);await fs.rename(path.join(copiedCourse,'upstream/tgaimage.cpp'),path.join(copiedCourse,'upstream/moved.cpp'));
      const r=await run(isolatedApp,red,'submit');assert.equal(r.status,'system_error');assert.equal(r.judgment.verdict,'SE');assert.match(r.message,/平台课程依赖/);
    }finally{await shutdown(isolatedApp);}
  });
  await reclaim();
  await t.test('real compile deadline at 30 seconds',async()=>{
    const tool=path.join(home,'slow-compiler.exe');const attempts=[];
    async function buildProxy(){
      // This fixture build is not what the case under test measures. The
      // toolchain sometimes refuses to create its temporary file; retrying here
      // with the same 30-second timeout keeps that environment hiccup from
      // hiding the real 30-second deadline check below. The run under test is
      // never retried, and no assertion or timeout is relaxed.
      for(let i=1;i<=3;i++){const built=await new ProcessRunner().run('C:\\msys64\\ucrt64\\bin\\g++.exe',['-std=c++17',path.join(here,'slow-compiler.cpp'),'-static','-lshell32','-o',tool],{cwd:home,timeout:30000});attempts.push('夹具构建第 '+i+' 次：code='+built.code+' timedOut='+built.timedOut+' error='+(built.error||'无')+' 输出='+JSON.stringify(built.diagnostics.slice(0,300)));if(built.code===0)return;}
      throw new Error('无法构建 slow-compiler 夹具（测试夹具准备失败，不是被测应用的缺陷），已尝试 '+attempts.length+' 次：\n'+attempts.join('\n'));
    }
    const readySource=path.join(home,'ready-probe.cpp'),readyExe=path.join(home,'ready-probe.exe');
    await fs.writeFile(readySource,'int main(){return 0;}');
    const realProbe=await new ProcessRunner().run('C:\\msys64\\ucrt64\\bin\\g++.exe',['-std=c++17',readySource,'-o',readyExe],{cwd:home,timeout:30000});
    assert.equal(realProbe.code,0,realProbe.diagnostics);
    await buildProxy();
    assert.ok((await fs.stat(tool)).size>0,'slow-compiler.exe 夹具应已生成');
    app=await launch({VIBE_CPP:tool,VIBE_TEST_PROBE:readyExe});
    // The instance is started here, so it is handed back here too: ready() throwing
    // must not leave a server holding this run's single-instance pipe.
    try{
      const t0=Date.now();await ready(app);const start=Date.now();const result=await run(app,red);assert.equal(result.status,'timeout');assert.equal(result.phase,'compile');assert.ok(Date.now()-start>=29000);assert.equal(result.image,null);
      console.log('夹具构建次数：'+attempts.length+'；探测耗时 '+(start-t0)+'ms；'+attempts.join(' | '));
    }finally{await shutdown(app);}
  });
  // Last: it replaces the saved draft with a deliberately incompatible file.
  await t.test('full-file edits restored and orphan directory retained',async()=>{
    const draft=path.join(home,'VibeLearning/drafts/tinyrenderer/level-01/starter.cpp');
    const full=red.replaceAll('image','canvas');await fs.writeFile(draft,full);
    const orphan=path.join(home,'VibeLearning/runs/unclaimed');await fs.mkdir(orphan);await fs.writeFile(path.join(orphan,'evidence'),'preserve');
    app=await launch();const st=await ready(app);assert.equal(st.restoreError,undefined);assert.equal(st.source,full);assert.ok(st.warnings.length);
    const r=await run(app,full,'submit');assert.equal(r.judgment.verdict,'AC');await shutdown(app);
    assert.equal(await fs.readFile(draft,'utf8'),full);assert.equal(await fs.readFile(path.join(orphan,'evidence'),'utf8'),'preserve');
  });
});
test('runner timeout, bounded logs, cleanup and strict lesson parser',async()=>{
  const runner=new ProcessRunner();const timed=await runner.run(process.execPath,['-e','setInterval(()=>{},1000)'],{timeout:100});assert.equal(timed.timedOut,true);assert.equal(runner.blocked,false);
  const noisy=await runner.run(process.execPath,['-e','process.stdout.write("x".repeat(1000000))'],{timeout:3000});assert.equal(noisy.code,0);assert.equal(noisy.diagnostics.length,16384);
  const onlyOne=()=>{try{parseLesson('## 目标\ntext');}catch(e){return e.message;}return '';};
  const wrongTitle=()=>{try{parseLesson('## 目标要\n## 只学本题需要的 C++\n');}catch(e){return e.message;}return '';};
  const missingMiddle=()=>{try{parseLesson('## 目标\n## 只学本题需要的 C++\n## 任务与可修改范围\n## 典型错误\n## 逐级提示\n## 答案解析\n## 迁移练习：某题\n');}catch(e){return e.message;}return '';};
  const badTransfer=lesson=>{try{parseLesson(lesson.replace('## 迁移练习','## 练习题'));}catch(e){return e.message;}return '';};
  assert.throws(()=>parseLesson('## 目标\ntext'),/标题/);
  // A maintainer who renames or removes a heading must be able to locate the
  // problem from the message alone, without reading core.mjs.
  assert.match(onlyOne(),/期望的 8 个二级标题/);
  assert.match(onlyOne(),/「1 目标」/);
  assert.match(onlyOne(),/实际读到的二级标题：「目标」（第 1 行 4 列）/);
  assert.match(wrongTitle(),/第 1 个应为「目标」，实际读到：「目标要」（第 1 行 4 列）/);
  assert.match(missingMiddle(),/第 4 个应为「公开样例和完成条件」，实际读到：「典型错误」（第 4 行 4 列）/);
  // COURSE_FORMAT.md §3: section 8's name belongs to the level, so its prefix is
  // checked and the rest of the title is free — but a missing prefix still fails.
  const lessonOf=async(...parts)=>parseLesson(await fs.readFile(new URL('../../../courses/tinyrenderer/'+parts.join('/'),import.meta.url),'utf8'));
  const one=await lessonOf('level-01','lesson.md');
  const two=await lessonOf('level-02','lesson.md');
  assert.equal(one.sections.length,8);
  assert.equal(two.sections.length,8);
  assert.equal(one.sections[7].title,'迁移练习：镜子另一侧的青点');
  assert.equal(two.sections[7].title,'迁移练习：倒着画一条陡线');
  assert.notEqual(one.sections[7].title,two.sections[7].title,'第 8 个标题随关卡命名，不写死在应用里');
  assert.match(badTransfer(await fs.readFile(new URL('../../../courses/tinyrenderer/level-02/lesson.md',import.meta.url),'utf8')),/第 8 个应以「迁移练习：」开头/);
  // Partition comes from the title, not from the position: a lesson whose
  // sections 6-8 are reordered still yields the right answer/hints/transfer.
  const title=two.sections[6].title,swap=two.sections.slice(0,5).concat([two.sections[7],two.sections[6]]);
  assert.equal(lessonParts({intro:two.intro,sections:swap}).answer.title,title,'答案解析应按标题名取用，不依赖第 7 个位置');
  const parts=lessonParts(two);
  assert.deepEqual(parts.visible.map(x=>x.title),['目标','只学本题需要的 C++','任务与可修改范围','公开样例和完成条件']);
  assert.equal(parts.errors.title,'典型错误');
  assert.equal(parts.hints.title,'逐级提示');
  assert.equal(parts.answer.title,'答案解析');
  assert.equal(parts.transfer.title,'迁移练习：倒着画一条陡线');
  await assert.rejects(removeOwned(home,path.dirname(home),'anything'),/边界/);
  const external=path.join(home,'external'),link=path.join(home,'junction');await fs.mkdir(external);await fs.symlink(external,link,'junction');await assert.rejects(atomicWrite(path.join(link,'test'),'x'),/联接/);await fs.unlink(link);
});
test.after(async()=>{let allStopped=true;for(const child of children){if(child.exitCode===null){allStopped=false;child.kill();}}if(allStopped)await removeOwned(here,home,owner);else console.log('Failed-test data retained at '+home);});
