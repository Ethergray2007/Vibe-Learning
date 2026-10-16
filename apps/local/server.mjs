import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes} from 'node:crypto';
import {unlinkSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {hash,parseLesson,lessonParts,noLinks,atomicWrite,removeOwned,ProcessRunner,validateImages,judgeRedPixel} from './core.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const course=path.resolve(here,'../../courses/tinyrenderer');
const data=path.join(process.env.LOCALAPPDATA,'VibeLearning');
const sessionId=randomUUID(), token=randomBytes(32).toString('hex');
const runsRoot=path.join(data,'runs'), sessionDir=path.join(runsRoot,sessionId);
// The session address is kept so a second start.cmd can hand the *existing*
// session to the browser instead of only printing it in the service window.
// It holds this session's token, so it is created 0600 and deleted on exit.
const sessionFile=path.join(data,'session.json');
const levels=new Map();
const runner=new ProcessRunner();
runner.launcher=path.join(here,'native/job-control.node');
const compiler=process.env.VIBE_CPP || 'C:\\msys64\\ucrt64\\bin\\g++.exe';
const childEnv={...process.env,PATH:path.dirname(compiler)+';'+process.env.PATH};
const compileEnv=dir=>({...childEnv,TMPDIR:dir.replaceAll('\\','/'),TEMP:dir,TMP:dir});
let server,origin,closing=false,busy=false,work=Promise.resolve(),saveQueue=Promise.resolve(),environment={ready:false,message:'正在检查 C++ 编译环境…'},latest=null;
function selected(id='level-01'){
  if(!levels.has(id))fail('关卡不存在',404);
  const level=levels.get(id);
  if(id==='level-02'&&!levels.get('level-01')?.learning.passed)fail('请先通过第一关，再学习基础线段。',403);
  return level;
}
function progress(){return Object.fromEntries([...levels].map(([id,l])=>[id,{passed:l.learning.passed===true,unlocked:id==='level-01'||levels.get('level-01')?.learning.passed===true}]));}
function updateLearning(level,patch){const job=level.learningQueue.then(async()=>{const next={...level.learning,...patch};await atomicWrite(level.learningFile,JSON.stringify(next));level.learning=next;});level.learningQueue=job.catch(()=>{});return job;}
const results=new Map();
const resultLimit=32,resultTtl=30*60*1000;
function pruneResults(reserve=false){
  for(const [id,r] of results)if(r.finishedAt&&Date.now()-Date.parse(r.finishedAt)>resultTtl){results.delete(id);resultBytes.delete(id);}
  for(const [id,r] of results){if(results.size<(reserve?resultLimit:resultLimit+1))break;if(r.finishedAt){results.delete(id);resultBytes.delete(id);}}
}
async function checkFixedDependencies(levelId){
  for(const file of [path.join(course,'upstream/tgaimage.cpp'),path.join(course,'upstream/tgaimage.h'),path.join(course,'support/output.h'),runner.launcher,...(levelId==='level-02'?[path.join(here,'native/line-judge.cpp')]:[])]){
    await noLinks(file);const handle=await fs.open(file,'r');
    try{const stat=await handle.stat();if(!stat.isFile()||stat.size===0)throw new Error('文件为空或无效');}finally{await handle.close();}
  }
}
const warnings=[];
const instance=net.createServer(socket=>socket.end('Vibe Learning 已在运行。请使用原服务窗口中的地址。\n'));
const pipe='\\\\.\\pipe\\VibeLearning-'+hash(data.toLowerCase()).slice(0,24);
try {await new Promise((resolve,reject)=>{instance.once('error',reject);instance.listen(pipe,resolve);});}
catch(e){
  console.error((e.code==='EADDRINUSE'?'Vibe Learning 已在运行。请使用原窗口中的地址；不要重复启动。':e.message)+'（单实例管道：'+pipe+'；LOCALAPPDATA='+String(process.env.LOCALAPPDATA)+'；数据根='+data+'；pid='+process.pid+'）');
  // Another instance holds the lock. Re-open the session it recorded, so a user
  // who closed the tab only has to start the app again. Never open an origin the
  // recorded session file cannot prove is a local Vibe Learning address.
  if(e.code==='EADDRINUSE'){
    const url=await readSessionUrl();
    if(url){await openBrowser(url);console.log('已在运行，已为你打开原会话。');}
    else console.log('没有可用的原会话地址，未打开浏览器；请使用原服务窗口中的地址。');
  }
  process.exit(1);
}

function fail(message,status=400){throw Object.assign(new Error(message),{status});}
// Opens a URL in the default browser. VIBE_BROWSER_LOG redirects this to a log
// file (test hook, documented in README): the fixtures must verify which address
// would be opened without launching a real browser. When the value is a
// directory, the log is per data root so concurrent test runs stay separate.
function openBrowser(url){
  const target=process.env.VIBE_BROWSER_LOG;
  if(target){
    const file=target.endsWith(path.sep)||target.endsWith('/')||target.endsWith('\\')
      ? path.join(target,'browser-'+hash(data.toLowerCase()).slice(0,12)+'.log') : target;
    // Returned so a caller that is about to exit can wait for the write.
    return fs.appendFile(file,url+'\n').catch(()=>{});
  }
  spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>console.error('自动打开失败，请复制服务窗口中的地址。'));
  return Promise.resolve();
}
// Only an address this application itself wrote and can still vouch for may be
// opened: loopback http, a port, and a 64-hex session token. Anything else is
// treated as "no session" rather than opening an unverified origin.
function validSessionUrl(value){
  if(typeof value!=='string')return false;
  try{const u=new URL(value);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port!==''&&/^[a-f0-9]{64}$/.test(u.hash.slice(1));}
  catch{return false;}
}
async function readSessionUrl(){
  try{await noLinks(sessionFile);const saved=JSON.parse(await fs.readFile(sessionFile,'utf8'));return validSessionUrl(saved?.url)?saved.url:null;}
  catch{return null;}
}
async function writeSession(url){
  await atomicWrite(sessionFile,JSON.stringify({app:'vibe-learning-a1',pid:process.pid,startedAt:new Date().toISOString(),url}));
}
const forgetSession=()=>fs.rm(sessionFile,{force:true}).catch(()=>{});
// During 'exit' only synchronous work runs, so the async form above would never
// complete there; a stale address would then point at a dead session.
const forgetSessionNow=()=>{try{unlinkSync(sessionFile);}catch{}};
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32768)fail('请求过大',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks));}catch{fail('请求必须是 JSON');}}
function sourceOf(value){if(typeof value!=='string'||!value.trim()||Buffer.byteLength(value)>16384)fail('代码不能为空或超过 16 KB');return value;}
function enqueueSave(level,value,expected){const job=level.saveQueue.then(async()=>{
  if(level.restoreError)fail(level.restoreError,409);
  if(expected!==level.revision)fail('草稿已由其他页面更新，请复制未保存文字后重新载入。',409);
  const source=sourceOf(value);await atomicWrite(level.draftFile,source);level.source=source;level.savedHash=hash(source);level.revision++;return {sourceHash:level.savedHash,revision:level.revision};
});level.saveQueue=job.catch(()=>{});return job;}
async function execute(result,source){
  const dir=path.join(sessionDir,result.runId),level=levels.get(result.levelId);
  const functionJudge=result.levelId==='level-02'&&result.mode==='submit';
  try{
    try{await checkFixedDependencies(result.levelId);}catch(e){throw new Error('平台课程依赖缺失或不可读：'+e.message);}
    await noLinks(dir);await fs.mkdir(dir);await fs.writeFile(path.join(dir,'starter.cpp'),source);
    const common=['-std=c++17','-O2','-Wall','-Wextra','-I',path.join(course,'upstream'),'-I',path.join(course,'support')];
    const sourceFile=path.join(dir,'starter.cpp'),objectFile=path.join(dir,'learner.o'),exe=path.join(dir,'run.exe');
    const commands=functionJudge?[
      [...common,'-DCOURSE_TEST','-Dmain=vibe_learning_observe_main','-c',sourceFile,'-o',objectFile],
      [...common,objectFile,path.join(here,'native/line-judge.cpp'),path.join(course,'upstream/tgaimage.cpp'),'-o',exe]
    ]:[[...common,sourceFile,path.join(course,'upstream/tgaimage.cpp'),'-o',exe]];
    const deadline=Date.now()+30000;
    for(const args of commands){
      const built=await runner.run(compiler,args,{cwd:dir,env:compileEnv(dir),timeout:Math.max(1,deadline-Date.now())});
      result.diagnostics=(result.diagnostics+'\n'+built.diagnostics).slice(0,16384);result.exitCode=built.code;
      if(built.error)throw new Error('编译执行失败：'+built.error);
      if(built.timedOut){result.status='timeout';result.message='编译超过 30 秒，已终止。';return;}
      if(built.code!==0){await checkFixedDependencies(result.levelId);result.status='compile_error';result.message='编译或接口链接失败，请检查代码及函数签名。';return;}
    }
    if(closing)throw new Error('服务正在关闭');
    result.phase=functionJudge?'judge':'execute';result.status='running';result.exitCode=null;
    const ran=await runner.run(path.join(dir,'run.exe'),[],{cwd:dir,env:childEnv,timeout:3000});
    result.diagnostics=(result.diagnostics+'\n'+ran.diagnostics).slice(0,16384);result.exitCode=ran.code;
    if(ran.error)throw new Error('程序无法启动：'+ran.error+(ran.errorCode?'（code='+ran.errorCode+'）':'')+(ran.diagnostics?'；进程输出：'+ran.diagnostics.slice(0,600):''));
    if(ran.timedOut){result.status='timeout';result.message='运行超过 3 秒，已终止。';return;}
    if(functionJudge){
      if(ran.code!==0&&ran.code!==42){result.status='runtime_error';result.message='函数检查异常退出：'+ran.code;return;}
      const file=path.join(dir,'judge-result.json');let report;
      try{await noLinks(file);const stat=await fs.stat(file);if(stat.size>4096)throw new Error('报告过大');report=JSON.parse(await fs.readFile(file,'utf8'));}
      catch{result.status='runtime_error';result.message='检查器未完成，不能仅凭程序退出 0 判定通过。';return;}
      if(report.completed!==true||typeof report.passed!=='boolean'||!Number.isInteger(report.cases)||report.cases<1||typeof report.category!=='string'||(report.passed&&(ran.code!==0||report.cases!==65548))||(!report.passed&&ran.code!==42))throw new Error('检查器报告无效');
      result.status='success';result.judgment={verdict:report.passed?'AC':'WA',checks:[{name:report.category,passed:report.passed,detail:report.passed?'65,536 组端点及 12 次颜色、背景、连续绘制检查通过':'请核对题面中的接口、取整、端点、颜色和背景规则。'}]};
      result.message=report.passed?'AC · 基础线段通过，进度已保存。':'WA · '+report.category+'不符合要求。';
    }else{
      if(ran.code!==0){result.status='runtime_error';result.message='程序运行失败，退出码 '+ran.code;return;}
      result.phase='output';
      try{const image=await validateImages(dir);result.image={runId:result.runId,url:'/api/image/'+result.runId,width:16,height:16};result.status='success';result.message='运行完成，可提交评测检查答案。';resultBytes.set(result.runId,image);
        if(result.mode==='submit'){result.judgment=judgeRedPixel(image);result.message=result.judgment.verdict==='AC'?'AC · 答案正确，进度已保存。':'WA · 请检查像素位置、颜色和背景。';}
      }catch(e){result.status='output_error';result.message='本次输出无效：'+e.message;}
    }
    if(result.judgment?.verdict==='AC'){
      try {await updateLearning(level,{passed:true,passedAt:new Date().toISOString(),acceptedSourceHash:result.sourceHash});}
      catch(e){result.judgment={verdict:'SE',checks:[],message:'答案检查通过，但进度保存失败，请重试。'};result.status='system_error';result.message=result.judgment.message;result.diagnostics+='\n'+e.message;result.image=null;resultBytes.delete(result.runId);}
    }
  }catch(e){result.status='system_error';result.message=e.message;}
  finally{
    if(result.mode==='submit'&&!result.judgment){
      const codes={compile_error:'CE',runtime_error:'RE',timeout:'TLE',output_error:'WA',system_error:'SE'};
      result.judgment={verdict:codes[result.status]||'SE',checks:[],message:result.message};
    }
    result.finishedAt=new Date().toISOString();busy=false;
  }
}
const resultBytes=new Map();
// The startup probe is an environment check, so its failure is reported as it is:
// the raw error plus whatever the process wrote. It is deliberately not retried —
// masking a real toolchain problem would be worse than failing loudly here.
const probeFailure=(label,r)=>{
  const raw=String(r.diagnostics||'').trim();
  return new Error(label+'：'+(r.error||('退出码 '+r.code))+(r.errorCode?'（code='+r.errorCode+(r.errorSyscall?' syscall='+r.errorSyscall:'')+'）':'')+(raw?'；进程输出：'+raw.slice(0,600):'；进程没有输出'));
};
async function probe(){
  // Keep all compiler outputs in this owned session. Some Windows policies
  // refuse writes from a custom compiler in the global Temp directory.
  const dir=await fs.mkdtemp(path.join(sessionDir,'probe-'));
  try {
    await noLinks(runner.launcher);await fs.access(runner.launcher);
    await fs.writeFile(path.join(dir,'probe.cpp'),'int main(){return 0;}');
    if(!path.isAbsolute(compiler))throw new Error('编译器必须是绝对路径');
    const built=await runner.run(compiler,['-std=c++17',path.join(dir,'probe.cpp'),'-o',path.join(dir,'probe.exe')],{cwd:dir,env:compileEnv(dir),timeout:30000});
    if(built.error)throw probeFailure('编译探测无法启动编译器',built);
    if(built.timedOut||built.code!==0)throw probeFailure('编译探测失败',built);
    if(closing)return;
    const probeFile=path.join(dir,'probe.exe');
    const ran=await runner.run(probeFile,[],{cwd:dir,env:childEnv,timeout:3000});
    if(ran.error){
      // Distinguish "the file is not there / not readable" from "the OS refused to
      // start it": both are fatal here, but only the first is a build problem.
      const state=await fs.stat(probeFile).then(s=>s.isFile()+'/'+s.size+' 字节',e=>'不存在（'+e.code+'）');
      throw probeFailure('探测程序无法启动（文件：'+state+'；存在性检查与启动尝试之间不留时间差）',ran);
    }
    if(ran.timedOut||ran.code!==0)throw probeFailure('探测程序运行失败',ran);
    environment={ready:true,message:'C++17 编译和运行检查通过',compiler};
  }catch(e){environment={ready:false,message:'C++ 环境不可用：'+e.message,compiler,guidance:'安装 MSYS2，在 UCRT64 终端安装 mingw-w64-ucrt-x86_64-gcc；默认路径 C:\\msys64\\ucrt64\\bin\\g++.exe。其他位置可设置 VIBE_CPP 为 g++.exe 的绝对路径，然后重启应用。应用不会自动安装。'};}
  finally{await fs.rm(dir,{recursive:true,force:true}).catch(()=>{});}
}
async function shutdown(){
  if(closing)return;closing=true;
  await forgetSession();
  try {await runner.stop();await work;await Promise.all([...levels.values()].flatMap(l=>[l.saveQueue,l.learningQueue]));
    if(!runner.blocked)await removeOwned(runsRoot,sessionDir,sessionId);
    else console.error('终止未确认，运行目录已保留，请检查遗留进程。');
  }catch(e){console.error('清理未完成，目录已保留：'+e.message);}
  server?.closeAllConnections();await new Promise(r=>server?server.close(r):r());await new Promise(r=>instance.close(r));
}
for(const signal of ['SIGINT','SIGTERM','SIGHUP','SIGBREAK'])process.on(signal,()=>void shutdown());
// A path that never reaches shutdown() (an uncaught error, a forced window close
// that still lets Node exit) must not leave a stale address behind.
process.on('exit',forgetSessionNow);
try{
  await noLinks(data);await fs.mkdir(runsRoot,{recursive:true});
  const old=await fs.readdir(runsRoot);if(old.length)warnings.push('检测到先前遗留运行目录；可能是异常退出。已保留，无法保证没有孤儿进程，请检查后人工处理。');
  await fs.mkdir(sessionDir);await fs.writeFile(path.join(sessionDir,'.owner.json'),JSON.stringify({app:'vibe-learning-a1',owner:sessionId}));
  for(const id of ['level-01','level-02']){
    const draftFile=path.join(data,'drafts/tinyrenderer',id,'starter.cpp'),learningFile=path.join(path.dirname(draftFile),'learning.json');
    const level={id,draftFile,learningFile,learning:{},revision:0,saveQueue:Promise.resolve(),learningQueue:Promise.resolve()};
    try{level.starter=(await fs.readFile(path.join(course,id,'starter.cpp'),'utf8')).replace(/^[ \t]*\/\/ EDIT (BEGIN|END)[^\n]*\n/gm,'');level.source=level.starter;level.lesson=parseLesson(await fs.readFile(path.join(course,id,'lesson.md'),'utf8'));}
    catch(e){level.lessonError='课程材料不可用：'+e.message;level.source='';level.starter='';}
    try{await noLinks(draftFile);level.source=sourceOf(await fs.readFile(draftFile,'utf8'));}catch(e){if(e.code!=='ENOENT')level.restoreError=e.message;}
    try{await noLinks(learningFile);const value=JSON.parse(await fs.readFile(learningFile,'utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('记录格式无效');level.learning=value;}catch(e){if(e.code!=='ENOENT')level.restoreError='学习记录无法读取：'+e.message;}
    level.savedHash=hash(level.source);levels.set(id,level);
  }
  server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try{
      if(closing)fail('服务正在关闭',503);
      if(req.headers.host!==new URL(origin).host)fail('Host 不匹配',403);
      if(req.headers.origin && req.headers.origin!==origin)fail('来源不匹配',403);
      if(req.headers['sec-fetch-site']==='cross-site')fail('拒绝跨站请求',403);
      const url=new URL(req.url,origin), route=url.pathname;
      if(req.method==='GET'&&(route==='/'||/^\/assets\/[a-zA-Z0-9_.-]+\.(js|css|woff2)$/.test(route))){
        const name=route==='/'?'index.html':route.slice(1);res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.woff2')?'font/woff2':'text/css; charset=utf-8');res.end(await fs.readFile(path.join(here,'dist',name)));return;
      }
      if(req.headers['x-vibe-token']!==token)fail('会话失效，请使用服务窗口中的地址重新打开。',403);
      if(req.method!=='GET'&&req.headers.origin!==origin)fail('缺少本机来源',403);
      if(req.method==='GET'&&route==='/api/state'){const l=selected(url.searchParams.get('levelId')||'level-01'),p=l.lesson?lessonParts(l.lesson):null;json(res,{environment,warnings,levelId:l.id,progress:progress(),lessonError:l.lessonError,restoreError:l.restoreError,lesson:p?{knowledge:p.visible[1],errors:p.errors}:null,source:l.source,starter:l.starter,revision:l.revision,savedHash:l.savedHash,answerSeen:l.learning.answerSeen===true,passed:l.learning.passed===true});return;}
      if(req.method==='PUT'&&route==='/api/draft'){const b=await body(req);json(res,await enqueueSave(selected(b.levelId),b.source,b.revision));return;}
      if(req.method==='POST'&&(route==='/api/run'||route==='/api/submit')){
        if(busy||runner.active)fail('已有运行或环境检测进行中，请稍候。',409);
        if(!environment.ready||runner.blocked)fail('运行暂不可用，请处理环境或课程错误。',503);
        busy=true;
        try{const b=await body(req);const l=selected(b.levelId);if(l.lessonError||l.restoreError)fail(l.lessonError||l.restoreError,503);const source=sourceOf(b.source);const saved=await enqueueSave(l,b.source,b.revision);
          if(closing)fail('服务正在关闭，代码已保存但没有开始运行。',503);
          latest={runId:randomUUID(),courseId:'tinyrenderer',levelId:l.id,mode:route==='/api/submit'?'submit':'run',judgment:null,sourceHash:saved.sourceHash,status:'compiling',phase:'compile',message:'正在编译…',diagnostics:'',exitCode:null,startedAt:new Date().toISOString(),finishedAt:null,image:null};
          // Retain bounded terminal results for delayed polling in other tabs.
          pruneResults(true);results.set(latest.runId,latest);work=execute(latest,source);json(res,{...saved,runId:latest.runId},202);
        }catch(e){busy=false;throw e;}return;
      }
      if(req.method==='GET'&&route.startsWith('/api/run/')){pruneResults();const result=results.get(route.slice(9));if(!result)fail('运行不存在或已过期（保留最近 32 次，最长 30 分钟）',404);json(res,result);return;}
      if(req.method==='GET'&&route.startsWith('/api/image/')){pruneResults();const id=route.slice(11),bytes=resultBytes.get(id);if(!bytes||results.get(id)?.status!=='success')fail('本次图片不可用或已过期',404);res.setHeader('Content-Type','image/bmp');res.end(bytes);return;}
      if(req.method==='POST'&&route==='/api/answer'){
        const b=await body(req),l=selected(b.levelId);
        if(!l.lesson||l.restoreError)fail('课程或学习记录不可用',409);
        const answer=lessonParts(l.lesson).answer;if(!answer)fail('课程缺少答案解析',409);
        await updateLearning(l,{answerSeen:true});json(res,{text:answer.text,code:await fs.readFile(path.join(course,l.id,'reference.cpp'),'utf8')});return;
      }
      if(req.method==='POST'&&route==='/api/shutdown'){json(res,{message:'正在退出'});setImmediate(()=>void shutdown());return;}
      fail('接口不存在',404);
    }catch(e){if(!res.headersSent)json(res,{error:{message:e.message}},e.status||500);else res.end();}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  const launchUrl=origin+'/#'+token;
  console.log('Vibe Learning 已启动。关闭浏览器不会结束服务；建议使用页面“退出应用”或 Ctrl+C。');
  console.log('数据根：'+data);
  console.log('打开地址（含本次会话凭据，请勿分享）：'+launchUrl);
  // Record the session before opening the browser, so closing the tab and
  // starting the app again can be served by this still-running instance.
  await writeSession(launchUrl).catch(e=>console.error('会话地址未能保存（重复启动时将不会自动打开原会话）：'+e.message));
  work=probe();
  if(!process.argv.includes('--no-open'))openBrowser(launchUrl);
}catch(e){console.error(e.message);await shutdown();process.exitCode=1;}
