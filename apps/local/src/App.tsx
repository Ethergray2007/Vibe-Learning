import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, CheckCircle2, ChevronRight, Code2, FileCode2, Flag, Loader2, LockKeyhole, Map, Play, RotateCcw, Save, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

type Section = { title: string; text: string }
type AppState = { levelId: string; progress: Record<string,{passed:boolean;unlocked:boolean}>; source: string; starter: string; revision: number; passed: boolean; answerSeen: boolean; environment: { ready: boolean; message: string; guidance?: string }; warnings: string[]; lessonError?: string; restoreError?: string; lesson: { knowledge: Section; errors: Section } | null }
type Result = { runId: string; mode: 'run' | 'submit'; sourceHash: string; status: string; message: string; diagnostics: string; finishedAt: string | null; image: { runId: string; url: string } | null; judgment: { verdict: string; checks: { name: string; passed: boolean; detail: string }[] } | null }
const token = location.hash.slice(1) || sessionStorage.getItem('vibe-token') || ''
if (location.hash) { sessionStorage.setItem('vibe-token', token); history.replaceState(null, '', location.pathname) }
async function api(url: string, method = 'GET', body?: unknown) {
  const response = await fetch(url, { method, headers: { 'X-Vibe-Token': token, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const value = await response.json()
  if (!response.ok) throw new Error(value.error?.message || '请求失败')
  return value
}
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function PixelImage({ target = false, line = false }: { target?: boolean; line?:boolean }) {
  if(line){const points=target?[[2,3],[3,4],[4,4],[5,5],[6,5],[7,6],[8,6],[9,7],[10,7]]:[[2,3],[10,7]];return <svg viewBox="0 0 16 16" className="pixel-example" shapeRendering="crispEdges" role="img" aria-label={target?'目标绿色线段':'初始两个绿色端点'}><rect width="16" height="16" fill="black"/>{points.map(([x,y])=><rect key={x+','+y} x={x} y={y} width="1" height="1" fill="#00ff00"/>)}</svg>} 
  return <svg viewBox="0 0 16 16" role="img" aria-label={target ? '目标：黑底，(4,6) 为红色' : '初始：黑底，(4,6) 为白色'} className="pixel-example" shapeRendering="crispEdges"><rect width="16" height="16" fill="black" /><rect x="4" y="6" width="1" height="1" fill={target ? '#ff0000' : '#ffffff'} /></svg>
}
// React escapes all lesson text; no raw HTML or script is interpreted.
function Inline({ text }: { text: string }) { return text.split(/(`[^`]+`)/).map((part, i) => part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part) }
function LessonText({ text }: { text: string }) {
  return <div className="lesson-copy">{text.split('\n').filter(line => line.trim()).map((line, i) => <p key={i}><Inline text={line} /></p>)}</div>
}
const chapters = [
  { title: '从像素到线段', goal: '认识颜色与坐标，亲手画出第一条线。', lessons: ['01 红色像素', '02 基础线段'], status: '当前章节' },
  { title: '绘制三角形', goal: '组合线段，用内部判断填满一个三角形。', lessons: ['03 三角形轮廓', '04 三角形填充'], status: '规划中' },
  { title: '走进三维空间', goal: '理解模型顶点与投影，处理物体的前后遮挡。', lessons: ['模型与投影', '深度缓冲'], status: '后续方向' },
  { title: '让画面有质感', goal: '认识光照、相机和纹理，逐步接近完整渲染器。', lessons: ['基础光照', '相机与纹理'], status: '后续方向' },
]
function Roadmap({ progress, onStart }: { progress: AppState['progress']; onStart: (id:string) => void }) {
 const count=Object.values(progress).filter(l=>l.passed).length;const passed=count>0;
  return <section className="roadmap"><div className="route-heading"><div><p className="text-sm text-muted-foreground">TinyRenderer 学习路线</p><h1>从一个像素，走向一个渲染器。</h1><p>先完成图形基础，再逐步理解三维图像是怎样生成的。</p></div><Badge variant={passed ? 'success' : 'secondary'}>{count} / 2 基础练习已通过</Badge></div>
    <Alert><BookOpen /><AlertTitle>当前开放两关</AlertTitle><AlertDescription>第一关通过后解锁基础线段。后续章节展示学习方向，内容与顺序会根据试学反馈调整。</AlertDescription></Alert>
    <ol className="chapter-list">{chapters.map((chapter, i) => <li key={chapter.title} className={cn('chapter', i === 0 && 'chapter-current')}><div className="chapter-number">{i + 1}</div><div className="chapter-body"><div className="flex flex-wrap items-center justify-between gap-3"><h2>第{i + 1}章 · {chapter.title}</h2><Badge variant={i === 0 ? 'outline' : 'secondary'}>{chapter.status}</Badge></div><p>{chapter.goal}</p><div className="chapter-lessons">{chapter.lessons.map((lesson, j) => <div key={lesson} className="chapter-lesson"><div className="flex items-center gap-3">{i===0&&progress[j===0?'level-01':'level-02']?.passed?<CheckCircle2 className="text-success"/>:i===0&&progress[j===0?'level-01':'level-02']?.unlocked?<Code2 className="text-primary"/>:<LockKeyhole className="text-muted-foreground"/>}<span>{lesson}</span></div>{i===0?<Button size="sm" disabled={!progress[j===0?'level-01':'level-02']?.unlocked} onClick={()=>onStart(j===0?'level-01':'level-02')}>{progress[j===0?'level-01':'level-02']?.passed?'再次练习':progress[j===0?'level-01':'level-02']?.unlocked?'开始学习':'通过第一关解锁'}<ChevronRight data-icon="inline-end"/></Button>:<Badge variant="secondary">未开放</Badge>}</div>)}</div></div></li>)}</ol>
  </section>
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [source, setSource] = useState('')
  const levelRef=useRef('level-01');const isLine=state?.levelId==='level-02';const title=isLine?'基础线段':'红色像素';const problemId=isLine?'VL1002':'VL1001'
  const sourceRef = useRef(''), revision = useRef(0), savedSource = useRef(''), queue = useRef(Promise.resolve()), debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [saveStatus, setSaveStatus] = useState('正在读取…')
  const [switching,setSwitching]=useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [page, setPage] = useState('problem')
  const [result, setResult] = useState<Result | null>(null), [image, setImage] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState(''), [answer, setAnswer] = useState<{ text: string; code: string } | null>(null)
  const [exited, setExited] = useState(false)
  const [quitting,setQuitting]=useState(false), quitGuard=useRef(false)
  const lineNumbers = useRef<HTMLPreElement | null>(null)
  const imageRef = useRef<string | null>(null), active = useRef(false), mounted = useRef(true)
  const ready = !!state?.environment.ready && !state.lessonError && !state.restoreError && !exited && !quitting
  function schedule<T>(job: () => Promise<T>): Promise<T> { const next = queue.current.then(job); queue.current = next.then(() => {}, () => {}); return next }
  function clearImage() { if (imageRef.current) URL.revokeObjectURL(imageRef.current); imageRef.current = null; setImage(null) }
  function change(value: string) {
    if(quitGuard.current || exited)return
    sourceRef.current = value; setSource(value); setSaveStatus('未保存'); clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { void save(value).catch(() => {}) }, 700)
  }
  function save(value = sourceRef.current) {
    const levelId=levelRef.current
    return schedule(async () => {
      setSaveStatus('保存中…')
      try { const r = await api('/api/draft', 'PUT', { levelId, source: value, revision: revision.current }); revision.current = r.revision; savedSource.current = value; setSaveStatus(sourceRef.current === value ? '已保存' : '未保存') }
      catch (e) { setSaveStatus('保存失败'); setError((e as Error).message); throw e }
    })
  }
  async function execute(mode: 'run' | 'submit') {
    if (active.current || quitGuard.current || exited) return
    active.current = true; setBusy(true); setError(''); clearTimeout(debounce.current)
    const value = sourceRef.current; setSnapshot(value); clearImage()
    setResult({ runId: '', mode, status: 'compiling', sourceHash: '', message: '正在保存并编译…', diagnostics: '', finishedAt: null, image: null, judgment: null })
    try {
      const accepted = await schedule(async () => { const r = await api(mode === 'submit' ? '/api/submit' : '/api/run', 'POST', { levelId: levelRef.current, source: value, revision: revision.current }); revision.current = r.revision; savedSource.current = value; setSaveStatus(sourceRef.current === value ? '已保存' : '未保存'); return r })
      for (;;) {
        if (!mounted.current) return
        const r: Result = await api('/api/run/' + accepted.runId); setResult(r)
        if (!r.finishedAt) { await pause(250); continue }
        if (r.image?.runId === r.runId) {
          let url: string | null=null
          try {
            const response=await fetch(r.image.url,{headers:{'X-Vibe-Token':token}})
            if(!response.ok)throw new Error('图片读取失败')
            url=URL.createObjectURL(await response.blob());const img=new Image();img.src=url
            await img.decode();if(img.naturalWidth!==16||img.naturalHeight!==16)throw new Error('图片尺寸不正确')
            imageRef.current=url;setImage(url)
          }catch{
            if(url)URL.revokeObjectURL(url)
            setError('本次图片无法预览，评测结果已保留。可重新运行查看图片。')
          }
        }
        if (r.judgment?.verdict === 'AC') { setState(s => s ? { ...s, passed: true,progress:{...s.progress,[s.levelId]:{passed:true,unlocked:true},...(s.levelId==='level-01'?{'level-02':{...s.progress['level-02'],unlocked:true}}:{})}} : s); toast.success('AC · 答案正确！', { description: title+'已通过，进度已保存。' }) }
        break
      }
    } catch (e) {
      setError((e as Error).message)
      setResult(previous => previous?.finishedAt ? previous : previous ? {...previous,status:'system_error',message:(e as Error).message,finishedAt:new Date().toISOString(),image:null,judgment:mode==='submit'?{verdict:'SE',checks:[]}:null}:null)
    }
    finally { active.current = false; setBusy(false) }
  }
  async function showAnswer() {
    try { setAnswer(await api('/api/answer', 'POST', {levelId:levelRef.current})); setState(s => s ? { ...s, answerSeen: true } : s) } catch (e) { setError((e as Error).message) }
  }
  async function switchLevel(id:string){
    if(active.current||quitGuard.current||exited)return;
    active.current=true;setBusy(true);setSwitching(true);clearTimeout(debounce.current);setError('');
    try{
      if(state)await save();await queue.current;
      const next:AppState=await api('/api/state?levelId='+encodeURIComponent(id));
      levelRef.current=id;revision.current=next.revision;savedSource.current=next.source;sourceRef.current=next.source;
      setSource(next.source);setState(next);setSaveStatus('已载入');setAnswer(null);setResult(null);setSnapshot('');clearImage();setPage('problem');window.scrollTo(0,0);
    }catch(e){setError((e as Error).message);toast.error((e as Error).message)}
    finally{active.current=false;setBusy(false);setSwitching(false)}
  }
  async function quit() {
    if (busy || quitGuard.current || exited) return
    quitGuard.current=true;setQuitting(true);setError('');clearTimeout(debounce.current)
    const latest=sourceRef.current
    try { await save(latest);await queue.current; await api('/api/shutdown', 'POST', {}); setExited(true); toast('已保存并退出应用') } catch (e) { setError((e as Error).message);quitGuard.current=false;setQuitting(false) }
  }
  useEffect(() => {
    mounted.current = true; let stopped = false
    async function load() {
      try {
        const s: AppState = await api('/api/state'); if (stopped) return
        revision.current = s.revision; savedSource.current = s.source; sourceRef.current = s.source; setSource(s.source); setState(s); setSaveStatus('已载入')
        while (!s.environment.ready && s.environment.message.includes('正在检查') && !stopped) {
          await pause(500); const next: AppState = await api('/api/state'); if (stopped) return; setState(next)
          if (!next.environment.message.includes('正在检查')) break
        }
      } catch (e) { if (!stopped) setError((e as Error).message) }
    }
    void load()
    const unload = (e: BeforeUnloadEvent) => { if (sourceRef.current !== savedSource.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', unload)
    return () => { stopped = true; mounted.current = false; clearTimeout(debounce.current); window.removeEventListener('beforeunload', unload); if (imageRef.current) URL.revokeObjectURL(imageRef.current) }
  }, [])
  const verdict = result?.judgment?.verdict
  const resultKind = verdict === 'AC' ? 'accepted' : result?.finishedAt && (verdict || result.status !== 'success') ? 'failed' : 'neutral'
  return <><Toaster position="top-center" theme="light" richColors /><header className="site-header"><div className="site-nav"><a href="#" onClick={e => { e.preventDefault(); setPage('problem') }} className="brand"><span className="brand-symbol"><Code2 /></span>Vibe Learning</a><Separator orientation="vertical" className="h-5" /><span className="course-name">TinyRenderer</span><nav aria-label="主导航"><Button variant={page === 'problem' ? 'secondary' : 'ghost'} onClick={() => setPage('problem')}><FileCode2 data-icon="inline-start" />题目练习</Button><Button variant={page === 'roadmap' ? 'secondary' : 'ghost'} onClick={() => setPage('roadmap')}><Map data-icon="inline-start" />课程路线</Button></nav><Button variant="ghost" size="sm" disabled={busy || quitting || exited || !state} onClick={() => void quit()}>{exited ? '已退出' : quitting ? '正在保存并退出…' : '保存并退出'}</Button></div></header>
    <main>
      {page === 'roadmap' ? <Roadmap progress={state?.progress||{}} onStart={id=>void switchLevel(id)} /> : <>
        <div className="breadcrumb"><button onClick={() => setPage('roadmap')}>课程路线</button><ChevronRight /><span>第 1 章 · 从像素到线段</span><ChevronRight /><span>{problemId}</span></div>
        <section className="problem-header"><div className="flex flex-col gap-2"><div className="flex flex-wrap items-center gap-3"><h1><span>{problemId}</span> {title}</h1><Badge variant="outline">入门</Badge>{state?.passed ? <Badge variant="success"><Check />已通过</Badge> : <Badge variant="secondary">未通过</Badge>}</div><p>{isLine?'实现 line 函数，连接任意两个合法端点。':'把黑色画布上的白点变成红点，位置保持不变。'}</p></div><div className="problem-meta"><span>C++17</span><span>运行限制 3 秒</span><span>本地评测</span></div></section>
        {error || state?.lessonError || state?.restoreError ? <Alert variant="destructive" className="mb-4"><XCircle /><AlertTitle>需要处理</AlertTitle><AlertDescription>{error || state?.lessonError || state?.restoreError}</AlertDescription></Alert> : null}
        {!ready ? <Alert className="mb-4"><Loader2 /><AlertTitle>{exited ? '应用已退出，重新双击启动文件即可继续' : state?.environment.message || '正在连接本地应用…'}</AlertTitle>{state?.environment.guidance ? <AlertDescription>{state.environment.guidance}</AlertDescription> : null}</Alert> : null}
        <div className="workspace"><section className="problem-pane" aria-label="题目内容"><Tabs defaultValue="problem"><TabsList variant="line" className="pane-tabs"><TabsTrigger value="problem">题目描述</TabsTrigger><TabsTrigger value="learn">知识与提示</TabsTrigger><TabsTrigger value="answer">题解</TabsTrigger></TabsList>
          <TabsContent value="problem" className="statement">{isLine?<><section><h2>题目描述</h2><p>完成 <code>line</code> 函数，使用传入的颜色连接两个端点，包含起点和终点，保留线段之外的图片内容。</p></section><section><h2>输入约定</h2><p>没有标准输入。检查器直接调用：</p><pre className="answer-code">{'void line(int ax, int ay, int bx, int by,\n          TGAImage &image, TGAColor color);'}</pre><p>图片为 16 × 16，坐标为 0～15 的整数。原点在左上角，x 向右、y 向下。</p></section><section><h2>输出要求</h2><p>令 n = max(|bx−ax|, |by−ay|)，取 i = 0～n，绘制下列坐标四舍五入后的像素：</p><pre className="answer-code">{'x = ax + (bx - ax) × i / n\ny = ay + (by - ay) × i / n'}</pre><p>i/n 为小数；恰好半格时向较大的整数取整。n=0 时只画一个点。使用传入颜色，其他像素保持原样。</p></section><section><h2>样例</h2><p>(2,3) 到 (10,7)，绿色。包含 9 个像素：</p><p><code>(2,3), (3,4), (4,4), (5,5), (6,5), (7,6), (8,6), (9,7), (10,7)</code></p><div className="examples"><figure><PixelImage line/><figcaption>初始 · 只有两端</figcaption></figure><ChevronRight/><figure><PixelImage line target/><figcaption>目标 · 完整线段</figcaption></figure></div></section><Alert><Flag/><AlertTitle>运行观察，提交检查函数</AlertTitle><AlertDescription>运行执行你的 main 并预览图片；提交用多组端点、颜色和背景调用 line。可以改写整份文件，保留全局函数接口即可。</AlertDescription></Alert></>:<><section><h2>题目描述</h2><p>给定一张 <strong>16 × 16</strong> 的黑色图片，初始代码在 <code>(4, 6)</code> 画了一个白点。请修改程序，让这个点变为<strong>纯红色</strong>，其余像素保持黑色。</p><p>坐标从左上角 <code>(0, 0)</code> 开始，x 向右，y 向下。</p></section><section><h2>输入格式</h2><p>无输入。</p></section><section><h2>输出要求</h2><ul><li>画布大小为 16 × 16。</li><li>像素 (4, 6) 的 RGB 为 (255, 0, 0)。</li><li>其他 255 个像素的 RGB 均为 (0, 0, 0)。</li></ul><p>调用提供的 <code>save_preview(image)</code> 保存图片，成功后返回 0。</p></section><section><h2>样例</h2><div className="examples"><figure><PixelImage /><figcaption>初始图片 · 白点</figcaption></figure><ChevronRight className="text-muted-foreground" /><figure><PixelImage target /><figcaption>目标图片 · 红点</figcaption></figure></div></section><Alert><Flag /><AlertTitle>完成方式</AlertTitle><AlertDescription>编辑右侧代码，可先运行查看图片；点击“提交评测”，全部检查通过后获得 AC。</AlertDescription></Alert></>}</TabsContent>
          <TabsContent value="learn" className="statement"><section><h2>需要用到的 C++</h2>{state?.lesson ? <LessonText text={state.lesson.knowledge.text} /> : null}</section><section><h2>易错点</h2><p>{isLine?'步数取横纵距离的较大值，包含两端；单点单独处理，颜色不能写死。':'本项目颜色顺序为 BGRA，坐标顺序为 x、y。最后一个合法坐标为 15。'}</p><p>可以改写整个 main.cpp；图像读写工具已提供，无需重写。评测检查行为，代码不需要与参考答案一致。</p></section></TabsContent>
          <TabsContent value="answer" className="statement"><h2>参考题解</h2><p>建议先独立尝试。查看题解会记录“已看答案”，不影响 AC 判定。</p><Button variant="outline" onClick={() => void showAnswer()} disabled={!state || busy || quitting || exited}><BookOpen data-icon="inline-start" />{state?.answerSeen ? '再次查看题解' : '查看题解'}</Button>{answer ? <><LessonText text={answer.text} /><pre className="answer-code">{answer.code}</pre></> : null}</TabsContent>
        </Tabs></section>
        <section className="solution-pane" aria-label="代码与评测"><div className="editor-header"><div className="flex items-center gap-2"><FileCode2 /><span>main.cpp</span><Badge variant="secondary">C++17</Badge></div><span className="text-xs text-muted-foreground" role="status">{saveStatus}</span></div>
          <Field className="code-field"><FieldLabel htmlFor="editor" className="sr-only">完整 C++ 代码</FieldLabel><div className="code-editor"><pre ref={lineNumbers} className="line-numbers" aria-hidden="true">{source.split('\n').map((_, i) => i + 1).join('\n')}</pre><Textarea id="editor" className="source-editor" aria-label="完整 C++ 代码" value={source} spellCheck={false} disabled={!state || !!state.restoreError || switching || quitting || exited} onChange={e => change(e.target.value)} onScroll={e => { if (lineNumbers.current) lineNumbers.current.scrollTop = e.currentTarget.scrollTop }} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const start = e.currentTarget.selectionStart, end = e.currentTarget.selectionEnd; change(source.slice(0, start) + '    ' + source.slice(end)); const input = e.currentTarget; requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = start + 4 }) } if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (ready && !busy) void execute('submit') } }} /></div></Field>
          <div className="editor-actions"><div className="flex items-center gap-1"><Button size="sm" variant="ghost" disabled={!state || busy || quitting || exited} onClick={() => { clearTimeout(debounce.current); void save().catch(() => {}) }}><Save data-icon="inline-start" />保存</Button><AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost" disabled={busy || quitting || !state || exited}><RotateCcw data-icon="inline-start" />重置</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>恢复初始代码？</AlertDialogTitle><AlertDialogDescription>当前编辑内容将被替换。请先复制需要保留的代码。已通过状态会保留。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => { if (state) change(state.starter) }}>恢复初始代码</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div><div className="flex gap-2"><Button variant="outline" disabled={!ready || busy} onClick={() => void execute('run')}><Play data-icon="inline-start" />运行</Button><Button disabled={!ready || busy} onClick={() => void execute('submit')}>{busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}提交评测</Button></div></div>
          <Separator /><div className="result-pane"><div className="flex items-center justify-between gap-3"><h2>运行与评测</h2><span className="text-xs text-muted-foreground">Ctrl + Enter 提交</span></div>
            {result ? <Alert className={cn('verdict-panel', resultKind)} role="status">{busy ? <Loader2 className="animate-spin" /> : verdict === 'AC' ? <CheckCircle2 /> : resultKind === 'failed' ? <XCircle /> : <Play />}<AlertTitle>{busy ? result.message : verdict ? `${verdict} · ${verdict === 'AC' ? '答案正确' : verdict === 'WA' ? '答案错误' : verdict === 'CE' ? '编译错误' : verdict === 'TLE' ? '超时' : verdict === 'RE' ? '运行错误' : '评测异常'}` : result.message}</AlertTitle><AlertDescription>{verdict === 'AC' ? '全部检查通过，本关进度已保存。' : verdict ? result.message : busy ? '正在使用本次代码进行编译和运行。' : '图片已生成，提交评测后可获得 AC / WA 结果。'}{snapshot !== source ? <p>代码已修改，此结果对应上次提交的代码。</p> : null}</AlertDescription></Alert> : <p className="result-empty">修改代码后点击运行，或直接提交评测。</p>}
            {result?.judgment?.checks?.length ? <ul className="check-list">{result.judgment.checks.map(check => <li key={check.name}>{check.passed ? <CheckCircle2 className="text-success" /> : <XCircle className="text-destructive" />}<div><span>{check.name}</span><p>{check.detail}</p></div></li>)}</ul> : null}
            {image ? <div className="output-image"><img src={image} width="160" height="160" alt="本次程序生成的图片" /><p>本次输出<br /><span>16 × 16，放大显示</span></p></div> : null}
            {result?.diagnostics ? <details className="diagnostics" open={result.status === 'compile_error'}><summary>编译与运行日志</summary><pre>{result.diagnostics}</pre></details> : null}
          </div>
        </section></div>
      </>}
      <footer><span>{exited ? '应用已退出' : ready ? 'C++ 环境就绪' : '环境检测中'} · 学习记录保存在本机</span>{state?.warnings.length ? <details><summary>运行环境提醒</summary>{state.warnings.map(w => <p key={w}>{w}</p>)}</details> : null}</footer>
    </main></>
}
