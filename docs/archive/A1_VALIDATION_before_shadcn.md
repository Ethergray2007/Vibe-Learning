# A1 本地应用验证记录

记录时间：2026-10-16（本文件是本轮实际执行的验证结果，**不是验收通过结论**）。
对象：`apps/local/**`。R1 审查请配合 `review/FILES.sha256` 与 `review/SOURCES.zip`（固定快照，见文末）。

## 1. 结论摘要

| 项目 | 结果 |
| --- | --- |
| 测试用例 | **18 / 19 通过，1 未通过** = 集成 15 项中 14 项通过（唯一未通过项为 §3.3）+ 客户端 4 项全部通过 |
| 通过的关键闭环 | 真实 g++ 编译：白点 → 红点、编译失败后恢复、非零退出、执行超时后恢复、BMP/TGA 损坏判定、旧保存被拒、忙时 409、重启恢复草稿与已看答案、单实例拒绝、Host/Origin/令牌边界、图片归属与 no-store、不兼容草稿保留与遗留目录保留 |
| 未通过 | 「real compile deadline at 30 seconds」——**环境探测阶段失败，30 秒编译超时本身未经本次验证**（§3.3） |
| 未验证 | 真实浏览器中的 BMP 解码与界面观感；干净 Windows 首次安装；真人学习效果；强杀服务时的清理保证 |

不要引用本文件作为「验收通过」。未通过项按 §3、§4 如实列出。

## 2. 环境

| 项 | 值 |
| --- | --- |
| 操作系统 | Windows 11 家庭版 中文版，10.0.26300 build 26300（x64） |
| Node.js | v24.14.1（win32 x64） |
| g++ | `C:\msys64\ucrt64\bin\g++.exe`，MSYS2，g++.exe (Rev5) 16.1.0 |
| `VIBE_CPP` | 未设置（使用默认编译器路径） |
| 项目根 | `C:\Users\q1213\Desktop\vibe_learning` |
| Git | 无仓库；固定快照改为 `review/FILES.sha256` + `review/SOURCES.zip` |
| 运行数据根（真实使用） | `%LOCALAPPDATA%\VibeLearning\` |

测试用数据根：`apps/local/tests/test-data-<随机>/`，每次运行新建，**不覆盖真实用户草稿**。

## 3. 实际执行的验证

### 3.1 命令与结果

```powershell
# 项目根目录
node --test apps/local/tests/integration.mjs apps/local/tests/client-state.mjs
```

最后一次运行（2026-10-16 13:5x），原始输出保存在 `review/_run-tests.log`：

```
tests 19   pass 18   fail 1   duration_ms ~15400
```

> 说明：主对话记录的基线是「18 项中 15 项通过」。本轮新增 1 项客户端用例
> 「lesson partitions render visible sections plus one collapsed region」，故总数为 19。
> 基线中失败的两项分别是「real compile deadline at 30 seconds」（见 §3.3，仍未通过）
> 与「incompatible draft preserved and orphan directory retained」（夹具缺陷，已修并通过，
> 见 §4）。

逐项结果：

| 用例 | 结果 |
| --- | --- |
| 集成 · single instance | 通过 |
| 集成 · access boundaries and answer withholding | 通过 |
| 集成 · white and red BMP, cache and run identity | 通过 |
| 集成 · compile failure and recovery | 通过 |
| 集成 · nonzero exit | 通过 |
| 集成 · execution timeout and recovery | 通过 |
| 集成 · missing and damaged output | 通过 |
| 集成 · stale saves rejected and save failure preserves draft | 通过 |
| 集成 · busy rejection and shutdown while executing | 通过 |
| 集成 · restart restores saved code and answer flag | 通过 |
| 集成 · missing compiler clear guidance | 通过 |
| 集成 · real compile deadline at 30 seconds | **失败（环境探测阶段，见 §3.3）** |
| 集成 · incompatible draft preserved and orphan directory retained | 通过（夹具缺陷修复后） |
| 集成 · runner timeout, bounded logs, cleanup and strict lesson parser | 通过 |
| 客户端 · lesson partitions render visible sections plus one collapsed region | 通过（本轮新增） |
| 客户端 · old save response cannot mark new text as saved | 通过 |
| 客户端 · run snapshot stays fixed while edits continue | 通过 |
| 客户端 · late result from previous run cannot update current image | 通过 |

### 3.2 本轮修改与通过项之间的对应

- 题面分区：`/api/state` 现只下发第 1–4 段到 `lesson.sections`、第 5 段到 `lesson.errors`，
  第 6–8 段不进入初始响应；`/api/answer` 按标题名取「答案解析」。集成用例
  「access boundaries and answer withholding」按段校验（第 1–5 段内容在、第 6–8 段
  内容不在），客户端用例校验折叠区渲染。
- 解析契约：前 7 个标题逐字一致 + 第 8 个以「迁移练习：」开头；level-01 与 level-02
  两个 lesson.md 均被喂给 `parseLesson` 并断言 8 段、第 8 段标题各自不同。
  解析失败信息含期望的 8 个标题、实际读到的标题及「第 N 行 M 列」、首个不一致项。
- 单实例与启动失败：`launch()` 不再把「进程已退出」抛成路径为空的错误；退出码与启动
  日志随断言一起输出（本轮定位该缺陷时即由此看到「已在运行」的原文）。

### 3.3 未通过：real compile deadline at 30 seconds（未验证）

- 复现方式：项目根目录执行
  `node --test --test-name-pattern="A1 real compiler" apps/local/tests/integration.mjs`
  （或整份集成测试），该子用例会先编译 `apps/local/tests/slow-compiler.cpp` 为夹具，
  再用 `VIBE_CPP` 指向它启动服务。
- 失败位置：**环境探测**（`ready(app)`），不是 30 秒超时断言本身。30 秒编译超时在
  本轮**没有得到验证**。
- 原始输出（最后一次运行，`review/_run-tests.log`）：

  ```
  Error: C++ 环境探测未通过：C++ 环境不可用：探测程序无法启动
  （文件：true/560 字节；存在性检查与启动尝试之间不留时间差）：
  进程启动失败：EFTYPE -4028 spawn spawn EFTYPE（code=EFTYPE syscall=spawn）；进程没有输出
  ```

  即：探测用 `probe.exe` 已经生成（560 字节），紧接着的启动被系统以 `EFTYPE`
  （libuv errno -4028）拒绝，且该进程没有任何输出。
- 已确认不是夹具本身不可运行：同一 `slow-compiler.exe` 在宿主机进程里连续 10 次
  直接启动全部 `code=0`，输出 `test compiler proxy: probe accepted`。
- 按用户要求，本轮**没有**在探测路径上加任何重试或阈值放宽：探测失败即显式失败，
  原始 `code` 与进程输出一并报出。夹具构建（`slow-compiler.cpp` 的编译）保留了最多
  3 次尝试，因为它不是被测对象，且每次尝试的 `code/error/输出` 都记录在日志里。
- 判断：环境瞬时问题，不是已证实的应用缺陷；但在本机无法排除「服务进程启动自建可执行
  文件」这一路径的环境限制，因此**保留为未验证**，不写成通过。

### 3.4 真实浏览器（未验证）

未在真实浏览器中打开应用并查看本关图像。因此以下仍未验证：BMP 在 Edge/Chrome 中的
实际解码与显示、最近邻放大观感、按钮流程、页面布局、自动打开浏览器的体验。
客户端用例只在 DOM 桩中运行 `app.js`，不覆盖渲染、解码或真实交互。

本节所有命令都直接启动 `apps/local/server.mjs`；`start.cmd` 本身（Node 版本检查、
`reg add` 控制台字体修正、`node server.mjs %*` 转发、失败时 `pause`）本轮**没有**重新执行。
主对话在 `start.cmd` 上做过的改动（`reg add` 一行）本轮保持原样、未回退。

### 3.5 其他未验证项

- 干净 Windows 环境下的首次安装（Node.js 与 MSYS2 均需另行安装）。
- 关闭服务窗口（强制关闭控制台）时进程树能否完整终止；强杀后的孤儿进程归属。
- 多页面同时编辑、断电等极端情况下的草稿一致性。
- 上游源码授权核对（分发前事项，本轮不做）。

## 4. 已修复并通过的用例：incompatible draft preserved and orphan directory retained

该用例在主对话基线与本轮早期整份运行中都失败，失败原因是**测试夹具缺陷**而非应用缺陷：

- 该子用例启动新实例后调用 `ready(app)`，而 `ready()` 会先读 `/api/state`；上一子用例
  「real compile deadline」在 `ready()` 抛错时没有走到自己的 `shutdown(app)`，被测实例
  仍持有本次运行的命名管道，于是新实例被单实例保护正确拒绝，报「已在运行」。
- 已修：`real compile deadline` 用 `try/finally` 保证「实例一经启动，无论成败都归还
  单实例锁」；`launch()` 对早期退出返回结果而不是抛异常；父测试注册 `t.after(reclaim)`
  兜底回收本次运行启动的所有实例。
- 修复后的实测：§3.1 的整份运行中该用例**通过**（`✔ incompatible draft preserved and
  orphan directory retained`，367ms），且此时前一个「real compile deadline」用例仍然失败——
  证明一个用例失败不再拖挂后续用例。
- 该用例曾经的失败输出同时是 `launch()` 改造的验证证据：修复前它报的是
  `TypeError: Failed to parse URL from undefined/api/state (ERR_INVALID_URL)`，掩盖了
  真实原因；现在直接报「已在运行」的原文与进程退出码。

## 5. 遗留实例与命名管道（按用户指示处理）

- 处理对象：早前环境探测遗留的 `node tests/_probe-slow.mjs`（PID 44364）及其启动的
  `apps/local/server.mjs`（PID 42348）。用户随后给出的 PID 1012、33592 在处置时已不存在。
- 处置方式：按用户指示，先 `taskkill /PID <pid> /T`（不带 `/F`）观察回调，需要时再 `/F`。
  执行前已确认这两个进程属于早前探测，不是用户 `start.cmd` 启动的实例。
- 处置结果（2026-10-16 13:43）：`Get-CimInstance Win32_Process` 过滤
  `vibe_learning\server.mjs` 返回空；PID 1012、33592 均不存在。
- **复绑测试第一次未通过，原因已查明并处理**：
  - 检查发现 `\\.\pipe\VibeLearning-0e1786c33bd813efbe5aec19` **就是真实数据根
    `%LOCALAPPDATA%\VibeLearning` 派生的管道**（与 `hash('C:\Users\q1213\AppData\Local\VibeLearning')`
    一致，此前我按 `LOCALAPPDATA` 本身推导是错的）。它当时确实被占用，绑定返回 `EADDRINUSE`。
  - 占用者是 PID 10592 `node server.mjs`（父进程是我启动的 `cmd.exe` 45948，13:43:17 启动），
    即上一轮我自己启动的实例，不随任务结束自动退出。
  - 终止 PID 10592 后立即复绑：**`0e17 绑定: 成功（已释放）`**。
  - 结论：管道不是「无法释放」，而是被一个具体且已确认归属的进程持有；该进程已终止，
    当前 `VibeLearning-*` 管道为空，没有任何 `apps/local/server.mjs` 实例在运行。
  - 教训：判断管道归属必须用应用自身的推导方式（`hash(LOCALAPPDATA + '\VibeLearning')`）
    复算，不能只按 `LOCALAPPDATA` 猜。

## 6. 本轮同时修正的测试夹具缺陷

1. `launch()` 启动失败不再返回 `origin=undefined`：进程提前退出时返回结果对象，
   断言与调用方错误消息都会带上服务自身的启动输出（见 §4 的修复前/后对比）。
2. 测试数据根唯一化：`test-data-<随机>`，避免与真实运行实例（同名管道派生自数据根）
   或其他并行测试运行冲突——单实例锁按数据根派生，固定测试根会让第二次启动被正确拒绝。
3. 应用一经启动即保证归还单实例锁（`try/finally` 与 `t.after(reclaim)`，含超时兜底）。
4. `ProcessRunner` 对 Windows 上 `spawn()` 的**同步**抛出（EFTYPE/EACCES）也返回结果，
   并把 `code`/`errno`/`syscall` 与 `e.message` 一起写入错误文本，不再只报一个裸字符串。
5. 探测与运行失败时同时报告原始 `diagnostics` 与文件状态（存在性/字节数）。
6. `at()` 的列号输出补齐空格：「第 1 行 4 列」（此前为「第 1 行4 列」）。

## 7. 固定快照（R1 用）

```powershell
node apps/local/tools/manifest.mjs          # 生成 FILES.sha256、SNAPSHOT.md、SOURCES.zip
node apps/local/tools/manifest.mjs --check  # 比对，最近一次输出：检查通过：18 个文件与清单一致
```

- `review/FILES.sha256`：18 个文件的 SHA-256 与字节数（apps/local/** 交付文件 + 应用读取的
  5 个课程侧文件）。
- `review/SNAPSHOT.md`：同一清单的可读版本与生成方式。
- `review/SOURCES.zip`：按清单打包的源码快照。
- `review/_run-tests.log`：§3.1 的原始测试输出。

清单生成后若再修改 `apps/local/**`，必须重新生成并重新测；本文件记录的是生成时刻的状态。
