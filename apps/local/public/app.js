const $=id=>document.getElementById(id);
const token=location.hash.slice(1)||sessionStorage.getItem('vibe-token');
if(location.hash){sessionStorage.setItem('vibe-token',token);history.replaceState(null,'',location.pathname);}
let revision=0,epoch=0,savedEpoch=0,queue=Promise.resolve(),timer,runActive=false,currentRun=null,snapshotText=null,ready=false,restoring=false;
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Restricted course Markdown: HTML is escaped; no links, images, or scripts are interpreted.
function inline(s){return escape(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');}
function markdown(text){let out='',table=false;for(const line of text.split('\n')){
  if(line.startsWith('|')){if(/^\|[\s:|\-]+\|$/.test(line))continue;if(!table){out+='<table>';table=true;}out+='<tr>'+line.split('|').slice(1,-1).map(x=>'<td>'+inline(x.trim())+'</td>').join('')+'</tr>';continue;}
  if(table){out+='</table>';table=false;}if(line.startsWith('# '))out+='<h3>'+inline(line.slice(2))+'</h3>';else if(line.trim())out+='<p>'+inline(line)+'</p>';
}return out+(table?'</table>':'');}
async function api(url,method='GET',body){const res=await fetch(url,{method,headers:{'X-Vibe-Token':token||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await res.json();if(!res.ok)throw new Error(result.error?.message||'请求失败');return result;}
function schedule(job){const next=queue.then(job);queue=next.catch(()=>{});return next;}
function clearPreview(){ $('preview').hidden=true;$('preview').removeAttribute('src');$('empty').hidden=false;$('empty').textContent='还没有本次结果'; }
function refreshSnapshot(){if(snapshotText!==null)$('snapshot').textContent=$('editor').value===snapshotText?'图片对应本次运行的代码。':'代码已修改；结果对应运行时的旧快照。';}
function updateButtons(){ $('run').disabled=!ready||runActive||restoring;$('save').disabled=restoring; }
function saved(e){if(e===epoch){savedEpoch=e;$('save-state').textContent='已保存';}else $('save-state').textContent='未保存';}
function save(){const value=$('editor').value,e=epoch;return schedule(async()=>{ $('save-state').textContent='保存中…';try{const r=await api('/api/draft','PUT',{editable:value,revision});revision=r.revision;saved(e);}catch(error){$('save-state').textContent='保存失败：'+error.message;throw error;} });}
$('editor').addEventListener('input',()=>{epoch++;$('save-state').textContent='未保存';refreshSnapshot();clearTimeout(timer);timer=setTimeout(()=>void save().catch(()=>{}),700);});
$('save').onclick=()=>{clearTimeout(timer);void save().catch(()=>{});};
$('run').onclick=async()=>{
  clearTimeout(timer);const value=$('editor').value,e=epoch;runActive=true;currentRun=null;snapshotText=value;clearPreview();$('diagnostics').hidden=true;$('run-state').textContent='正在保存并开始运行…';refreshSnapshot();updateButtons();
  try {const accepted=await schedule(async()=>{ $('save-state').textContent='保存中…';const r=await api('/api/run','POST',{editable:value,revision});revision=r.revision;saved(e);return r;});currentRun=accepted.runId;await poll(accepted.runId);}
  catch(error){$('run-state').textContent='未完成运行：'+error.message;$('save-state').textContent=savedEpoch===epoch?'已保存':'保存或运行请求失败，请重试';}
  finally{runActive=false;updateButtons();}
};
async function poll(id){for(;;){const r=await api('/api/run/'+id);if(currentRun!==id)return;$('run-state').textContent=r.message;$('snapshot').textContent='运行 '+id.slice(0,8)+' · '+($('editor').value===snapshotText?'本次代码':'代码已修改，结果对应旧快照');
  if(!r.finishedAt){await new Promise(resolve=>setTimeout(resolve,250));continue;}
  $('diagnostics').textContent=r.diagnostics;$('diagnostics').hidden=!r.diagnostics;
  if(r.status==='success'&&r.image?.runId===id){const response=await fetch(r.image.url,{headers:{'X-Vibe-Token':token}});if(!response.ok)throw new Error('本次图片读取失败');const url=URL.createObjectURL(await response.blob());const img=new Image();try{img.src=url;await img.decode();if(img.naturalWidth!==16||img.naturalHeight!==16)throw new Error('图片尺寸无效');if(currentRun!==id)return;$('preview').src=url;$('preview').hidden=false;$('empty').hidden=true;}catch{clearPreview();$('run-state').textContent='预览失败：浏览器无法解码本次 BMP。';}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}
  return;
}}
$('answer').onclick=async()=>{try{const r=await api('/api/answer','POST',{});$('answer-content').innerHTML=markdown(r.text);const code=document.createElement('pre');code.textContent=r.code;$('answer-content').append(code);$('answer').textContent='已看答案';}catch(e){$('answer-content').textContent=e.message;}};
$('quit').onclick=async()=>{clearTimeout(timer);$('editor').disabled=true;$('save').disabled=true;$('run').disabled=true;$('quit').disabled=true;try{if(!restoring)await save();await api('/api/shutdown','POST',{});ready=false;restoring=true;updateButtons();$('environment').textContent='应用已退出。再次双击 start.cmd 即可继续学习。';}catch(e){$('warnings').textContent='未退出：'+e.message;$('editor').disabled=restoring;$('quit').disabled=false;updateButtons();}};
window.addEventListener('beforeunload',e=>{if(savedEpoch!==epoch){e.preventDefault();e.returnValue='';}});
async function boot(){try{const state=await api('/api/state');revision=state.revision;restoring=!!state.restoreError;ready=state.environment.ready&&!state.lessonError&&!restoring;
  $('environment').textContent=state.environment.message+(state.environment.guidance?'\n'+state.environment.guidance:'');$('warnings').textContent=[...state.warnings,state.lessonError,state.restoreError].filter(Boolean).join('\n');
  if(state.lesson){$('lesson').innerHTML=markdown(state.lesson.intro)+state.lesson.sections.map(s=>'<h2>'+inline(s.title)+'</h2>'+markdown(s.text)).join('')+(state.lesson.errors?'<details><summary>'+inline(state.lesson.errors.title)+'</summary>'+markdown(state.lesson.errors.text)+'</details>':'');}
  $('prefix').textContent=state.prefix;$('suffix').textContent=state.suffix;$('editor').value=state.editable;$('editor').disabled=restoring||!!state.lessonError;$('save-state').textContent=restoring?'恢复失败，原稿已保留':'已载入草稿';$('answer').textContent=state.answerSeen?'已看答案 · 再次查看':'查看答案';updateButtons();
  if(!state.environment.ready&&state.environment.message.includes('正在检查'))setTimeout(refreshEnvironment,500);
}catch(e){$('warnings').textContent=e.message;}}
async function refreshEnvironment(){try{const s=await api('/api/state');$('environment').textContent=s.environment.message+(s.environment.guidance?'\n'+s.environment.guidance:'');ready=s.environment.ready&&!s.lessonError&&!s.restoreError;updateButtons();if(s.environment.message.includes('正在检查'))setTimeout(refreshEnvironment,500);}catch(e){$('environment').textContent='服务连接失败：'+e.message;}}
const ctx=$('baseline').getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,16,16);ctx.fillStyle='white';ctx.fillRect(4,6,1,1);
void boot();
