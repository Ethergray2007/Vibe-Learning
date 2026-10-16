// Regenerates apps/local/review/ for R1: a fixed SHA-256 manifest, a readable
// snapshot index, and a source archive. This snapshot supplements Git review, especially before the first commit, so
// this script is what makes a reviewable fixed snapshot possible. It is
// read-only with respect to the code it hashes; it writes only inside
// apps/local/review/.
//
//   node apps/local/tools/manifest.mjs            # write FILES.sha256, SNAPSHOT.md, SOURCES.zip
//   node apps/local/tools/manifest.mjs --check    # verify FILES.sha256 against the disk
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const local=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const review=path.join(local,'review');
const root=path.resolve(local,'../..');
// Excluded from both hashing and packing: test scratch directories, generated
// binaries, the review output itself, and runtime/temporary artifacts. These are
// not part of the delivered application.
const excluded=name=>name.startsWith('test-data-')||name.startsWith('probe-data-')||name.startsWith('iso-')||name==='probe-home'
  ||name==='node_modules'||name==='ui-data'||name==='review'||name==='startup-failure.log'||name.endsWith('.node')||name.endsWith('.tmp')||/\.(exe|obj|o|zip|log)$/i.test(name);
// Course-side files the application actually reads. Listed explicitly: the
// course is not in apps/local's modification scope, but a review of the running
// application needs the exact inputs it parsed.
const courseFiles=[
  'courses/tinyrenderer/support/output.h',
  'courses/tinyrenderer/upstream/tgaimage.h',
  'courses/tinyrenderer/upstream/tgaimage.cpp',
  'courses/tinyrenderer/level-01/lesson.md',
  'courses/tinyrenderer/level-01/starter.cpp',
  'courses/tinyrenderer/level-01/reference.cpp',
  'courses/tinyrenderer/level-01/transfer.cpp',
  'courses/tinyrenderer/level-02/lesson.md',
  'courses/tinyrenderer/level-02/starter.cpp',
  'courses/tinyrenderer/level-02/reference.cpp',
];

async function walk(directory){
  const out=[];
  for(const entry of (await fs.readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
    if(excluded(entry.name))continue;
    const full=path.join(directory,entry.name);
    if(entry.isDirectory())out.push(...await walk(full));
    else if(entry.isFile())out.push(full);
  }
  return out;
}
const sha256=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const relative=file=>path.relative(root,file).split(path.sep).join('/');

const files=[...await walk(local),path.join(local,'native/job-control.node'),...courseFiles.map(f=>path.join(root,f))];
const rows=[];
for(const file of files)rows.push({path:relative(file),bytes:(await fs.stat(file)).size,sha256:await sha256(file)});
rows.sort((a,b)=>a.path<b.path?-1:1);
const stamp=new Date().toISOString();

if(process.argv.includes('--check')){
  let listed=[];
  try{listed=(await fs.readFile(path.join(review,'FILES.sha256'),'utf8')).split('\n');}catch(e){console.error('缺少 review/FILES.sha256：'+e.message);process.exit(1);}
  const expected=new Map();
  for(const line of listed){const m=/^([a-f0-9]{64})\s+\d+\s+(\S.*)$/.exec(line);if(m)expected.set(m[2].trim(),m[1]);}
  const current=new Map(rows.map(r=>[r.path,r.sha256]));
  let bad=0;
  for(const [file,digest] of expected)if(current.get(file)!==digest){console.log('不一致：'+file);bad++;}
  for(const file of current.keys())if(!expected.has(file)){console.log('清单缺少：'+file);bad++;}
  console.log(bad?'检查未通过，'+bad+' 项不一致':'检查通过：'+expected.size+' 个文件与清单一致');
  process.exit(bad?1:0);
}

await fs.mkdir(review,{recursive:true});
await fs.writeFile(path.join(review,'FILES.sha256'),
`# apps/local 交付文件摘要（SHA-256）
#
# 由 node apps/local/tools/manifest.mjs 生成，生成时间 ${stamp}。
# 本项目已关联 Git 仓库；此快照作为补充，R1 审查以本清单与同目录 SOURCES.zip 作为固定快照。
# 比对方式：node apps/local/tools/manifest.mjs --check
#
# sha256                                                            bytes  path
${rows.map(r=>r.sha256+'  '+String(r.bytes).padStart(8)+'  '+r.path).join('\n')}
`);
await fs.writeFile(path.join(review,'SNAPSHOT.md'),snapshot(rows,stamp));
await pack(rows);
console.log('共 '+rows.length+' 个文件（FILES.sha256 与 SNAPSHOT.md 已写入 review/）');

function section(title,list){return '## '+title+'\n\n'+(list.length?list.map(r=>'- `'+r.path+'` — '+r.bytes+' 字节 — `'+r.sha256.slice(0,16)+'…`').join('\n'):'（无）')+'\n';}
function snapshot(rows,stamp){
  const app=rows.filter(r=>r.path.startsWith('apps/local/'));
  const course=rows.filter(r=>r.path.startsWith('courses/'));
  return `# apps/local R1 固定快照

生成时间：${stamp}
生成方式：\`node apps/local/tools/manifest.mjs\`
用途：本项目已关联 Git 仓库；此快照作为补充，R1 审查针对本清单与 \`SOURCES.zip\` 中的文件内容；比对方式 \`node apps/local/tools/manifest.mjs --check\`。
范围：apps/local/**（不含测试临时目录、生成的 exe、review/ 自身），加课程侧被应用读取的文件。
未包含：运行时产物（%LOCALAPPDATA%\\VibeLearning\\ 下的草稿与运行目录）、Node.js 与 MSYS2 工具链、课程目录本身的其他文件。
注意：\`apps/local/VALIDATION.md\` 是本快照生成时的验证记录，不是验收通过结论。

${section('应用文件（apps/local/**）',app)}
${section('课程侧被读取的文件（只读；不属于 apps/local 修改范围）',course)}
`;
}
// The archive is produced by the Windows built-in bsdtar (present since Windows
// 10 1803) from the manifest's own path list, so no bundling dependency is added.
// If tar is unavailable the manifest and SNAPSHOT.md still provide the fixed
// snapshot; the script reports that instead of failing the whole run.
async function pack(rows){
  const listFile=path.join(review,'_pack-list.txt');
  await fs.writeFile(listFile,rows.map(r=>r.path).join('\r\n')+'\r\n');
  const result=await new Promise(resolve=>{
    // -T takes the file list; Windows' bsdtar reads "@file" as an mtree spec.
    const child=spawn('tar.exe',['-a','-c','-f',path.join(review,'SOURCES.zip'),'-C',root,'-T',listFile],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let text='';child.stdout.on('data',d=>text+=d);child.stderr.on('data',d=>text+=d);
    child.on('error',e=>resolve({code:null,error:e.message}));
    child.on('close',code=>resolve({code,text}));
  });
  await fs.unlink(listFile).catch(()=>{});
  const ok=result.code===0;
  console.log(ok?'已写入 review/SOURCES.zip':('未生成 SOURCES.zip（'+(result.error||('tar 退出码 '+result.code))+'：'+(result.text||'').trim().slice(0,300)+'）；FILES.sha256 与 SNAPSHOT.md 仍是固定快照'));
  return ok;
}
