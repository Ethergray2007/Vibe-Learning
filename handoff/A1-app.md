# 任务书 · 应用开发专项

下发：2026-10-16 主对话。任务编号 A1（交付补齐与修正）。
状态：**待执行**。

# 任务书 · 应用开发专项

下发：2026-10-16 主对话。任务编号 A1（交付补齐与修正）。
状态：**进行中——主干已按前置提示词完成，剩余项见文末清单**。

## 主对话独立复核（2026-10-16 12:5x）

已复核通过的部分：

- 任务 1 部分完成：apps/local/review/ 已建立（当前含 _run-tests.log）。
- 任务 2 完成：core.mjs 已改为「前 7 个标题共用数组 + 第 8 个前缀 transferPrefix = 迁移练习：」；
  parseLesson 仍严格校验数量与顺序；新增的分区取用 lessonParts 按标题名而非位置。新增回归测试
  integration.mjs:164-172 用真实 level-01 与 level-02 文件断言两关均可解析、且第 8 个标题两关不同。
- 任务 3 完成：server.mjs:103 现在返回 {intro, sections: 前 4 段, errors: 第 5 段}；
  server.mjs:118-122 的 /api/answer 按标题名取「答案解析」并在缺失时返回 409。主对话用真实启动
  探针确认：lesson 字段只有 intro/sections/errors，sections 恰好 4 项（目标 / 只学本题需要的 C++ /
  任务与可修改范围 / 公开样例和完成条件），原始响应不含「逐级提示」「答案解析」「迁移练习」。
- 任务 4 部分完成：launch() 启动失败改为抛出「服务启动失败，进程已退出（退出码 N）」并附服务输出；
  req() 在 origin 缺失时直接报错，不再产生 ERR_INVALID_URL；环境探测失败会同时带出服务端消息与启动输出。

## 剩余必做

1. 先处理遗留实例。当前测试套件 14/19 通过，失败项的直接原因已定位：
   - single instance（122ms，退出码 1）：duplicate 启动直接打印
     「Vibe Learning 已在运行。请使用原窗口中的地址；不要重复启动。」——即同一数据根已有活着的实例。
   - incompatible draft preserved and orphan directory retained（120ms，同一原因）。
   该实例是 node.exe pid=33592（父 cmd.exe pid=1012，自 12:02:07 起），持有命名管道
   \\.\pipe\VibeLearning-0e1786c33bd813efbe5aec19。主对话实测该管道 EADDRINUSE，确认持有者仍活着。
   该管道名对应默认数据根 C:\Users\q1213\AppData\Local\VibeLearning——说明这个实例的 LOCALAPPDATA
   就是默认值，但该目录现在不存在（不要为结论好看而改清理或启动逻辑，照实记录）。
   用户已授权终止。请：先不带 /F 的 taskkill 观察回调，再 /F 强制；确认管道释放；重跑套件。
2. real compile deadline at 30 seconds：环境探测阶段失败，服务端消息为
   C++ 环境不可用：Cannot create temporary file in C:\Users\q1213\AppData\Local\Temp: Permission denied。
   主对话已独立验证：该 Temp 目录 ACL 正常、g++ 直接编译 exit 0、Node 写临时文件正常，
   判断为环境瞬时问题而非应用缺陷；我的启动探针当时也因此连带失败 3 项。
   说明：夹具构建加重试（最多 3 次、失败时抛「测试夹具准备失败，不是被测应用的缺陷」、不重试被测运行、
   不放宽超时）可以接受，但**必须先排掉遗留实例的影响再重跑**；只有真正跑过 30 秒超时才算这条验收通过。
   「异常退出遗留目录保留」那条同样在它之后重跑。
3. VALIDATION.md 尚未建立，apps/local/README.md 第 21、53 行仍引用它。交付物清单：
   VALIDATION.md + review/ 下的固定文件摘要（SHA-256 清单）与打包快照。只写事实：当前是
   「14/19 通过，另有未完成项」，不要写成验收通过。

## 两个小问题

- core.mjs:16 的 at() 生成的位置文本没有空格：实际输出「第 1 行4 列」，与 integration.mjs:159/160/161
  期望的「第 1 行 4 列」不一致（「第 2 行 4 列」等同样问题）。当前这是唯一一处纯代码缺陷导致的失败，
  统一空格即可，别改断言。
- 测试跑完遗留 apps/local/tests/ 下 6 个 test-data-*、probe-data-NsAXBZ、probe-home 与 _probe-*.mjs。
  README 写明失败时保留供排查，属预期行为；但交付前请清理，别把测试残留留在交付目录里。

## 主对话已附带的证据（可直接引用，不必重复造）

真实启动探针（临时数据根，未污染默认数据根）：启动成功、地址含 64 位十六进制令牌；环境探测返回
「C++17 编译和运行检查通过」；/api/state 分区正确；草稿路径与运行目录按约定创建；
POST /api/shutdown 后进程退出、会话运行目录被清理干净、drafts 未被删除。

## 可选（用户尚未要求，先不要做）

遗留实例会占住单实例锁却给不出可用地址。若将来要改善体验，加一条「如何识别并终止遗留实例」的
用户可见指引；本轮不做，先把上面三项做完。

---
## 当前状态

A1 代码已存在于 apps/local/，主对话实测测试套件含真实 g++ 编译闭环
（白点→红点、编译失败与恢复、非零退出、执行超时与恢复、损坏输出、旧保存被拒、忙时 409、
重启恢复草稿与答案标记）。

必读：LOCAL_APP_PLAN.md、COURSE_FORMAT.md（第 3 节已更新，务必读最新版）、
apps/local/API.md、apps/local/README.md、apps/local/server.mjs、apps/local/core.mjs、
apps/local/public/app.js、apps/local/tests/integration.mjs。

## 任务 1（解除 R1 阻塞，最高优先）：补齐交付物

apps/local/README.md 第 21、53 行引用了 VALIDATION.md 和 review/；review/ 已建立但只有 _run-tests.log，VALIDATION.md 与固定文件摘要仍缺；项目无 Git 仓库，R1 因此没有可审查的固定快照。需要：

- apps/local/VALIDATION.md：实际执行的命令、结果、未验证项、环境信息。
- apps/local/review/：固定文件摘要（SHA-256 清单）与打包快照。

只写事实：状态是「14/19 通过，另有未完成项」，不要写成验收通过。

## 任务 2：修正解析器的标题契约

COURSE_FORMAT.md 最新规则：前 7 个标题逐字一致；第 8 个以「迁移练习：」开头，题目名随关卡
命名；第 8 个标题不得写死在应用里。

core.mjs:7 的 headings 需要改：前 7 项保留，第 8 项改为前缀校验，不再绑定
「迁移练习：镜子另一侧的青点」。校验仍严格：数量必须为 8、前 7 个逐字匹配、第 8 个必须
以前缀开头，任何不符即停止题面展示。

课程侧已完成对齐并验证：两关均恰好 8 个二级标题、前 7 个一致、第 8 个带各自题目名；
python checks/verify.py 21 项全通过（主对话已复核）。

新增回归测试：把 level-02 的 lesson.md 文本喂给 parseLesson，断言解析成功，证明契约不再
只对第一关成立。

## 任务 3：修正 /api/state 的分区

现状 server.mjs:103 下发 lesson.sections.slice(0,5)，即第 5 段「典型错误」也随初始响应发给
客户端再由客户端折叠，不符合 COURSE_FORMAT.md 第 3 节。改为：

- 第 1-4 段进初始可见区；第 5 段单独字段（如 lesson.errors）由客户端折叠区展开；
  第 6/7/8 段不进入初始响应。
- server.mjs:120 的 lesson.sections[6] 改为按标题名取「答案解析」分区。
- 更新 integration.mjs:35 断言：第 6/7/8 段内容不在初始响应、「逐级提示」内容也不在、
  第 5 段内容在；客户端 app.js 相应改造。
- core.mjs:11 的解析失败报错需指出期望标题与实际读到的标题及位置。

## 任务 4：测试夹具与如实报告

integration.mjs 的 launch() 在服务启动失败时返回 origin=undefined，随后
fetch(undefined+'/api/state') 报 ERR_INVALID_URL，掩盖真实原因；改为直接断言失败并输出
启动日志。

重跑：node --test apps/local/tests/integration.mjs apps/local/tests/client-state.mjs

以下两条子测试本轮因探测阶段失败未完成，请重跑；若仍失败，在 VALIDATION.md 明确列为
未验证（附复现方式与输出），不要为让断言通过而改断言或超时阈值：

- real compile deadline at 30 seconds
- incompatible draft preserved and orphan directory retained

已收集输出（仅供参考）：C++ 环境不可用：Cannot create temporary file in
C:\Users\q1213\AppData\Local\Temp: Permission denied（发生在探测自定义编译器的步骤）。
主对话已独立验证该 Temp 目录 ACL 正常、g++ 直接编译 exit 0，判断为环境瞬时问题。

## 约束

- 只改 apps/local/**，不新增依赖，不改课程、不改根目录公共文件。
- 本轮不做 A2（第二关接入、检查、提示、进度、记录导出）；完成 A1 后先交付 R1。
- 上游源码授权核对是分发前事项，不影响本轮。

## 12:5x 补充：孤儿实例实测（含新证据）

- 真正的孤儿是 node.exe pid=33592 + cmd.exe pid=1012（12:02:07 起），持有默认数据根对应的管道
  \\.\pipe\VibeLearning-0e1786c33bd813efbe5aec19。start.cmd 双击后的行为已复现：node 绑管道失败
  → 打印「已在运行」→ exit 1 → 脚本 if errorlevel 1 pause 停住等按键，窗口只有一行字，容易被
  误判成「什么都没发生」。该实例用 --no-open 启动且凭据只打印在已消失的终端里，randomBytes(32)
  每次启动随机生成，所以它虽然健康运行（GET / 返回 200、/api/state 403），但用户拿不到凭据，
  等于不可用。用户已授权终止。
- 重跑套件（12:5x/13:3x）显示 single instance 已能通过，管道名每次运行都不同
  （如 VibeLearning-951d5673b35eab..., f67450b8347b43d...），说明套件内正常情况不与该孤儿冲突。

## 12:5x 补充：测试夹具的真实缺陷（必须修）

最近两次运行的失败项固定为两条，机制已定位：

1. real compile deadline at 30 seconds：环境探测阶段报「C++ 环境不可用：spawn EFTYPE」，fixture 未重试。
   这条测试在 ready(app) 处抛出，而 ready 后面的 `await shutdown(app)`（integration.mjs:164）
   在抛错时根本不会执行 —— 于是**被测应用进程没被关掉，继续持有该次运行的命名管道**。
2. incompatible draft preserved and orphan directory retained：它用同一个 home 调 launch()，
   于是自己被上一条留下的实例挡住，报
   「服务启动失败，进程已退出（退出码 1）：Vibe Learning 已在运行。（单实例管道：...
   LOCALAPPDATA=...test-data-ac4b42e9ac1a-JFUzsa；数据根=...；pid=31508）」。

结论：**第 2 条失败是第 1 条失败的连带后果，不是独立缺陷**。请修：

- 让每个用例在被测应用已启动后无论成败都归还锁：用 try/finally 包住，或在 ready() 失败路径上
  也调用 shutdown(app)（可在 t.after/finally 里统一处理），别让一个用例的失败污染后续用例。
- spawn EFTYPE 要查清：注意 core.mjs 里 `if(built.error)throw new Error(built.error)` 是在
  `if(built.timedOut)` 之前，而 finish({code:null,error:...}) 会带上已经积累的 diagnostics，
  所以 seen 的 EFTYPE 很可能只是 g++ 输出里的字符串，真实原因是夹具构建或探测执行失败。
  改法：报告原始 diagnostics，不要只报 error 字段；确认「先报 timedOut 再报 error」的次序是否需要调整。
- 不要用重试掩盖它。夹具构建加重试可以保留，但探测失败必须显式失败并把原始诊断留在输出里。

## 可选（这一轮先不做）

- start.cmd 的中文乱码：主对话本轮已改（第 2 行后加 reg add ... FaceName="Lucida Console"，
  静默失败、不设全局 chcp 副作用；已自检：UTF-8 无 BOM、20/20 CRLF、cmd 语法自检 exit 0）。
  请在你本轮复核时确认这处改动仍在、且不破坏 UTF-8 无 BOM + CRLF 约束。
- 遗留实例的用户可见处理指引（如何识别并终止），与上面同一失败模式，等 A1 交付后再说。