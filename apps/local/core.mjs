import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

export const hash = text => createHash('sha256').update(text).digest('hex');
export const headings = ['目标','只学本题需要的 C++','任务与可修改范围','公开样例和完成条件','典型错误','逐级提示','答案解析'];
// COURSE_FORMAT.md §3: section 8 is the level's own transfer exercise, so only
// its prefix is fixed; the题目名 belongs to the course, not to the application.
export const transferPrefix = '迁移练习：';
const lastHeadingLabel = i => i === headings.length ? '第 8 个应以「'+transferPrefix+'」开头' : '第 '+(i+1)+' 个应为「'+headings[i]+'」';
const headingMatches = (title,i) => i < headings.length ? title === headings[i] : (i === headings.length && typeof title === 'string' && title.startsWith(transferPrefix));
// A markdown table separator row is not a heading; ignoring it keeps one stray
// pipe-delimited line from hiding every real heading behind one line number.
const ignoredHeading = title => /^[\s:|\-]+$/.test(title);
const at = (text,offset) => {const before=text.slice(0,offset);const line=before.split('\n').length;const lastBreak=before.lastIndexOf('\n');return '第 '+line+' 行 '+(offset-(lastBreak+1)+1)+' 列';};
const list = titles => titles.length?titles.join('、'):'（无）';
function headingProblem(found){
  const mismatch=[];
  for(let i=0;i<Math.max(found.length,headings.length+1);i++){
    if(found[i]&&headingMatches(found[i].title,i))continue;
    mismatch.push(lastHeadingLabel(i)+'，实际读到：'+(found[i]?'「'+found[i].title+'」（'+found[i].where+'）':'（缺少）'));
  }
  return '课程标题不符合约定，已停止题面展示（不会退回显示全文）。\n'
    +'期望的 8 个二级标题，顺序固定：前 7 个逐字一致，第 8 个以「'+transferPrefix+'」开头。\n'
    +'  '+headings.map((t,i)=>'「'+(i+1)+' '+t+'」').join('、')+'、「8 '+transferPrefix+'<本关题目名>」。\n'
    +'实际读到的二级标题：'+list(found.map(f=>'「'+f.title+'」（'+f.where+'）'))+'。\n'
    +'首个不一致：'+mismatch[0]+'。\n'
    +'请课程维护者按 COURSE_FORMAT.md 第 3 节修改 lesson.md 的二级标题后重新打开页面。';
}
export function parseLesson(text) {
  const normalized=text.replaceAll('\r\n','\n');
  const pieces=normalized.split(/^## /m);
  const headingsAt=[];{const scan=/^## .*$/gm;let hit;while((hit=scan.exec(normalized)))headingsAt.push(hit.index+3);}
  if(headingsAt.length!==pieces.length-1)throw new Error('课程标题无法可靠定位：二级标题行数与 ## 分隔结果不一致；请联系课程维护者。');
  const sections=pieces.slice(1).map((s,i)=>{
    const i2=s.indexOf('\n');return {title:(i2<0?s:s.slice(0,i2)).trim(),text:(i2<0?'':s.slice(i2+1)).trim(),where:at(normalized,headingsAt[i])};
  });
  const effective=sections.filter(s=>!ignoredHeading(s.title));
  if(effective.length!==headings.length+1||effective.some((s,i)=>!headingMatches(s.title,i)))throw new Error(headingProblem(effective));
  return {intro:pieces[0].trim(),sections:effective};
}
// Server-side partition of the eight fixed sections. Only the first four, plus
// the fifth for its collapsed region, may reach the initial response.
export const lessonParts = lesson => {
  if(!lesson)return null;
  const by=title=>lesson.sections.find(s=>s.title===title);
  return {intro:lesson.intro,visible:lesson.sections.slice(0,4),errors:by(headings[4]),hints:by(headings[5]),answer:by(headings[6]),transfer:lesson.sections[7]};
};
export function templateParts(source) {
  const match = /^(.*?\/\/ EDIT BEGIN[^\n]*\n)([\s\S]*?)([ \t]*\/\/ EDIT END[\s\S]*)$/s.exec(source.replaceAll('\r\n','\n'));
  if (!match) throw new Error('课程编辑标记无效');
  return {prefix:match[1], editable:match[2], suffix:match[3]};
}
export function restoreEditable(source, parts) {
  if (!source.startsWith(parts.prefix) || !source.endsWith(parts.suffix)) throw new Error('已保存草稿与课程模板不兼容。原稿已保留，请先备份并检查，不会自动重置。');
  return source.slice(parts.prefix.length, -parts.suffix.length);
}
// Check every existing ancestor, including the data root: never traverse junctions.
export async function noLinks(target) {
  const absolute=path.resolve(target); const root=path.parse(absolute).root;
  let current=root;
  for (const piece of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current=path.join(current,piece);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('拒绝链接或目录联接：'+current); }
    catch(e) { if(e.code==='ENOENT') return; throw e; }
  }
}
export async function atomicWrite(file, text) {
  await noLinks(file); await fs.mkdir(path.dirname(file),{recursive:true});
  const temp=file+'.'+randomUUID()+'.tmp';
  try { await fs.writeFile(temp,text,{flag:'wx',mode:0o600}); await noLinks(file); await fs.rename(temp,file); }
  finally { await fs.unlink(temp).catch(()=>{}); }
}
export async function removeOwned(root, directory, owner) {
  const rel=path.relative(path.resolve(root),path.resolve(directory));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('拒绝清理边界外目录');
  await noLinks(directory);
  const marker=JSON.parse(await fs.readFile(path.join(directory,'.owner.json'),'utf8'));
  if(marker.owner!==owner || marker.app!=='vibe-learning-a1') throw new Error('运行目录归属不明，已保留');
  async function inspect(dir) { for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name); await noLinks(file); if(entry.isDirectory()) await inspect(file);
  }}
  await inspect(directory); await fs.rm(directory,{recursive:true});
}
export class ProcessRunner {
  active=null; blocked=false; launcher=null;
  async stop() { if(this.active) await this.active.stop(); }
  run(command,args,{cwd,timeout=3000,env=process.env}={}) {
    if(this.active || this.blocked) throw new Error('执行器忙或终止失败，请重启并检查遗留进程');
    return new Promise(resolve=>{
      let diagnostics='', timedOut=false, closed=false, settled=false, stopping;
      let spawnFailed=false, spawnError=null;
      let native=null,job=null,targetCode=null;
      // A bare e.message can be empty for low-level spawn failures; the code and
      // syscall are what make the cause diagnosable in the reported log.
      const describe=e=>[e.code,e.errno,e.syscall,e.message].filter(Boolean).join(' ');
      // Declared before the try: the catch path needs to clear it, and a const
      // referenced before its declaration would throw instead of reporting.
      let timer=null, child;
      const finish=result=>{if(settled)return;settled=true;clearTimeout(timer); if(this.active?.child===child)this.active=null; resolve({...result,diagnostics,timedOut});};
      try {
        child=spawn(this.launcher?process.execPath:command,this.launcher?[fileURLToPath(new URL('./native/worker.mjs',import.meta.url))]:args,{cwd,env:{...env,VIBE_HOST_PID:String(process.pid)},windowsHide:true,stdio:this.launcher?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe']});
      } catch(e) {
        // spawn() can throw synchronously on Windows (EFTYPE/EACCES/UNKNOWN while
        // the file is momentarily unavailable). Report it as a result with its
        // code, so callers never have to guess from a bare message.
        clearTimeout(timer);
        resolve({code:null,error:'进程启动失败：'+describe(e),errorCode:e.code??null,errorSyscall:e.syscall??null,diagnostics:'',timedOut:false});
        return;
      }
      const collect=data=>{if(diagnostics.length<16384)diagnostics+=(data.toString().slice(0,16384-diagnostics.length));};
      child.stdout.on('data',collect); child.stderr.on('data',collect);
      if(this.launcher){
        child.on('message',message=>{
          if(message.type==='target-exit')targetCode=message.code;
          if(message.type==='spawn-error'){spawnFailed=true;spawnError=message.error;}
        });
        child.once('spawn',()=>{
          try{
            native=require(this.launcher);job=native.create();native.assign(job,child.pid);
            child.send({type:'start',command,args},error=>{if(error){spawnFailed=true;spawnError=error.message;child.kill();}});
          }catch(e){spawnFailed=true;spawnError='进程组绑定失败：'+describe(e);child.kill();}
        });
        child.once('exit',()=>{
          if(job)try{native.terminate(job);}catch(e){this.blocked=true;spawnFailed=true;spawnError='进程组清理失败：'+describe(e);}
        });
      }

      const stop=()=>stopping??=(async()=>{
        if(closed)return;
        if(!child.pid){this.blocked=true;return;}
        if(job){try{native.terminate(job);}catch(e){this.blocked=true;finish({code:null,error:'终止进程组失败：'+describe(e)});}return;}
        const killer=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
        const killCode=await new Promise(r=>{const t=setTimeout(()=>{killer.kill();r(-1);},5000);killer.on('error',()=>{clearTimeout(t);r(-1);});killer.on('close',c=>{clearTimeout(t);r(c);});});
        for(let n=0;n<20&&!closed;n++)await new Promise(r=>setTimeout(r,50));
        if(!closed || (killCode!==0 && !closed)){this.blocked=true;finish({code:null,error:'终止进程树失败；请重启服务并检查遗留进程'});}
      })();
      this.active={child,stop};
      timer=setTimeout(()=>{timedOut=true;void stop();},timeout);
      child.on('error',e=>{spawnFailed=true;spawnError=describe(e);finish({code:null,error:spawnError});});
      child.on('close',async code=>{
        closed=true;
        if(this.launcher)code=targetCode;
        if(spawnFailed){finish({code,error:spawnError});return;}
        if(stopping)stopping.then(()=>finish({code}));else finish({code});
      });
    });
  }
}
export async function validateImages(directory) {
  async function read(name,max) {
    const file=path.join(directory,name);await noLinks(file);const handle=await fs.open(file,'r');
    try {const s=await handle.stat();if(!s.isFile()||s.size>max)throw new Error('图片过大或无效');
      const buffer=Buffer.alloc(max+1);const {bytesRead}=await handle.read(buffer,0,max+1,0);
      if(bytesRead>max)throw new Error('图片过大');return buffer.subarray(0,bytesRead);
    }finally{await handle.close();}
  }
  const b=await read('preview.bmp',4096), t=await read('framebuffer.tga',4096);
  if(b.length!==822 || b.toString('ascii',0,2)!=='BM' || b.readUInt32LE(2)!==822 || b.readUInt32LE(10)!==54 || b.readUInt32LE(14)!==40 || b.readInt32LE(18)!==16 || b.readInt32LE(22)!==16 || b.readUInt16LE(26)!==1 || b.readUInt16LE(28)!==24 || b.readUInt32LE(30)!==0)throw new Error('BMP 缺失或格式无效，要求 16×16、24 位未压缩图片');
  if(t.length!==812 || t[0]!==0 || t[1]!==0 || t[2]!==2 || t.readUInt16LE(12)!==16 || t.readUInt16LE(14)!==16 || t[16]!==24 || t[17]!==32 || t.toString('ascii',794,812)!=='TRUEVISION-XFILE.\0')throw new Error('TGA 缺失或格式无效');
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)for(let channel=0;channel<3;channel++){
    if(b[54+(15-y)*48+x*3+channel]!==t[18+y*48+x*3+channel])throw new Error('BMP 与 TGA 的像素不一致');
  }
  return b;
}

// Judge pixels, not source text or file hashes. Coordinates are top-left;
// the course's uncompressed BMP stores rows bottom-up and channels BGR.
export function judgeRedPixel(bmp) {
  const pixel=(x,y)=>{const offset=54+(15-y)*48+x*3;return [bmp[offset+2],bmp[offset+1],bmp[offset]];};
  const target=pixel(4,6);
  let extras=0;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(x!==4||y!==6){if(pixel(x,y).some(c=>c!==0))extras++;}
  const checks=[
    {name:'目标像素 (4, 6) 为纯红色',passed:target[0]===255&&target[1]===0&&target[2]===0,detail:'实际 RGB：'+target.join(', ')},
    {name:'其余 255 个像素保持黑色',passed:extras===0,detail:extras===0?'全部符合':'发现 '+extras+' 个额外非黑像素'},
  ];
  return {verdict:checks.every(c=>c.passed)?'AC':'WA',checks};
}
