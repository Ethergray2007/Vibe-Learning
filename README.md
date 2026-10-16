# AI氛围学习 / 聚合AI个性化学习

**Vibe Learning** —— 围绕 GitHub 真实项目组织学习路线的编程闯关本地应用，基于 Node.js 构建。

> 当前进度：TinyRenderer 前两关已接入，支持完整代码编辑、运行与提交判题；第一关 AC 后解锁第二关。

体验借鉴 OJ：读题 → 在本地界面敲完整代码 → 运行样例 → 提交评测 → 按结果修改 → AC 后解锁下一关。核心目标是**一次制作课程，多人重复学习；课程可以迁移，进度相互独立**。架构目标是**稳定核心 + 可替换模块 + 可下载安装的插件与 MOD**。

部署为纯本地：不需要云服务器、数据库或对象存储，日常学习与评测不联网。

## 架构

```text
浏览器界面  React 19 + Vite + Tailwind + shadcn/ui（构建产物 apps/local/dist/）
      │
      │  HTTP：仅监听 127.0.0.1，带 X-Vibe-Token 与 Origin 校验
      ▼
本机宿主  Node.js 原生 HTTP 服务（apps/local/server.mjs）
      ├── 课程解析与题面组织   core.mjs，按 lesson.md 八标题契约
      ├── 草稿与进度持久化     %LOCALAPPDATA%/VibeLearning/
      └── 判题调度             单活动任务，运行与提交分离
               │
               ▼
      本地受限执行  MSYS2 UCRT64 g++，C++17
      进程组由 native/job-control.node + worker.mjs 用 Job Object 托管
      编译上限 30 秒、执行上限 3 秒
```

完整产品与第一版目标见 [docs/product/PROJECT_PLAN.md](docs/product/PROJECT_PLAN.md) 第 10 节，可替换模块与插件边界见 [docs/product/PLUGIN_ARCHITECTURE.md](docs/product/PLUGIN_ARCHITECTURE.md)。

| 部分 | 现状 |
| --- | --- |
| 学习界面 | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + shadcn/ui（Radix） |
| 本机宿主 | Node.js 24+ 原生 HTTP，只监听 127.0.0.1 |
| 本地持久化 | 本机文件；正式数据库方案待定 |
| 判题执行 | 原生 g++ 子进程 + Job Object 进程组，属内部原型，**不是完整安全沙箱** |
| AI 制课 | 未实现（属待实现需求，不是取消） |
| 课程包导入导出 | 未实现；当前普通文件目录只是原型资料 |
| 插件 / SDK / MOD | 未实现，保留为完整第一版目标 |
| 多学习者身份与提交历史 | 未实现 |

## 目录

```text
Vibe-Learning/
├── apps/local/              本地应用：React 前端 + Node.js 宿主 + 本地判题
│   ├── src/                 前端源码（构建输出到 dist/）
│   ├── native/              Node-API 进程组模块、受控 worker 与线段检查器
│   ├── tests/               集成测试与像素判题回归测试
│   ├── review/              R1 定版快照与界面截图
│   └── start.cmd            启动入口
├── courses/tinyrenderer/    首门课程：TinyRenderer 前两关 + 固定上游源码快照
│   ├── level-01/            第一关「改一个像素，看到变化」（已接入应用）
│   ├── level-02/            第二关「把散点连成线」（第一关 AC 后解锁）
│   ├── upstream/            上游源码快照，仅作来源证据，不与课程 main 一起编译
│   └── checks/              作者验证脚本 verify.py
├── docs/                    公共文档，导航见 docs/README.md
│   ├── product/             完整产品与第一版目标
│   ├── prototype/           当前原型实现与约定
│   ├── tasks/               当前任务与交付状态
│   └── archive/             历史追溯
├── handoff/                 历史专项任务书
├── AGENTS.md                Agent 协作规则
└── README.md
```

## 快速开始

环境要求：

- Windows
- Node.js 24 或更新版本
- MSYS2 UCRT64 g++，默认 `C:\msys64\ucrt64\bin\g++.exe`；装在别处用环境变量 `VIBE_CPP` 指定绝对路径。应用不会自动安装编译器。

首次准备（需要联网，仅为安装依赖）：

```powershell
cd apps\local
npm ci
npm run build
```

`npm run build` 会先用本机 g++ 和 node-api-headers 编译 `native/job-control.node`，配合 `native/worker.mjs` 管理进程组。两者都是运行必需资源。不要只构建前端，也不要直接复制 dist。

启动：双击 `apps\local\start.cmd`（或在 `apps\local` 执行 `npm start`），界面在 127.0.0.1 本地打开。完成构建后，学习与评测都不需要联网。

在界面里：

- 题目默认只显示任务、输入、输出和样例；C++ 知识与易错点在「知识与提示」，题解需要主动查看，查看后会记录已看答案。
- 完整 `main.cpp` 可编辑，支持 Tab 缩进、自动保存、手动保存和重置确认，`Ctrl+Enter` 提交。
- **运行**只编译、执行并显示图片，不产生 AC；**提交评测**才判题：第一关检查像素，第二关检查函数行为。样例通过不等于正式通过。
- 第一关判题规则：输出必须是有效的 16×16 BMP/TGA，`(4,6)` 为 RGB(255,0,0)，其余 255 个像素为 RGB(0,0,0)。允许不同写法，不要求与参考代码逐字一致。
- 第二关判题规则：独立检查器调用 `line`，验证端点、取整、颜色与背景保留；提交 AC 不要求生成图片。
- 状态含义：AC 全部必需检查通过，WA 像素或输出不符，CE 编译失败，RE 运行异常，TLE 超时，SE 平台或进度保存失败。
- 通过状态保存在本机，后续答错不会撤销；点「保存并退出」才会停止本地服务，关闭浏览器不会结束服务。

## 开发进度

首门课程为 TinyRenderer，固定上游 commit `706b2dfecff65daeb93de568ee2c2bd87f277860`，语言 C++17。

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| V0 | 验证原型：前两关完整代码编辑、运行预览、像素/函数判题、绿色 AC、章节路线与解锁 | 已实现，有构建、编译与浏览器证据 |
| C1 / C2 | 第一关与第二关课程资料及作者验证 | 前两关资料已交付并接入应用；完整课程包尚未实现 |
| R1 | 独立审查固定版本 | 独立复核关闭五项；剩余编译回归已修复并自测，待再次独立复核 |
| V1 再试用 | 真人体验新界面并验证理解 | 待进行 |
| M1 | 本地学习与评测核心：多关卡、提交历史、进度解锁、受限执行、题型协议 | 部分实现：前两关与解锁；历史、正式题型协议与隔离待做 |
| M2 | 课程内容与迁移：正式课程包、编辑、校验、发布、版本 | 未开始 |
| M3 | AI 制课：GitHub 导入、分步分析、模板出题、试评测与重试 | 未开始 |
| M4 | 可扩展第一版：插件协议、SDK、模板包与 MOD 组合 | 未开始 |

M1～M4 合起来才对应完整第一版，当前原型已覆盖前两关学习闭环，M1 尚未完整交付。AI 制课、模板、课程包导入导出、内容编辑/审核/发布/版本、多题型、提交历史、多学习者独立记录、插件/SDK/MOD 都属于**待实现，不是取消**；课程路线中三角形及之后的章节尚未实现。

当前任务分配与证据以 [docs/tasks/TASKS.md](docs/tasks/TASKS.md) 为准，本轮详细测试与未验证项见 [apps/local/VALIDATION.md](apps/local/VALIDATION.md)。

## 验证与测试

在项目根目录执行：

```powershell
# 应用集成测试 + 像素判题回归测试（使用独立临时数据，不覆盖你的草稿）
node --test apps/local/tests/integration.mjs apps/local/tests/client-state.mjs

# 核对 apps/local 定版快照的 SHA-256
node apps/local/tools/manifest.mjs --check

# 课程作者验证：初始图、主任务图、迁移图、BMP/TGA 逐像素与方向比对、端点穷举
python courses/tinyrenderer/checks/verify.py
```

## 已知边界

- 本地进程执行（g++ 子进程 + 目录与超时限制）**不是完整安全沙箱**；导入第三方课程或代码插件之前必须先补齐执行隔离。
- 本地用户拥有本机文件控制权，隐藏测试与答案无法达到云端级保密；不承诺对本机拥有者防作弊。
- 干净 Windows 环境开箱验证、强制结束服务后的孤儿进程清理、真人迁移学习效果、上游源码授权核对均**仍待完成**。
- 第二关已接入并由第一关 AC 解锁；迁移练习、正式课程包与安装程序尚未实现。

## 文档

公共文档集中在 [docs/](docs/README.md)：

- [docs/product/PROJECT_PLAN.md](docs/product/PROJECT_PLAN.md) — 完整产品与实施规划 v0.6
- [docs/product/PLUGIN_ARCHITECTURE.md](docs/product/PLUGIN_ARCHITECTURE.md) — 插件与模块架构规划
- [docs/prototype/LOCAL_APP_PLAN.md](docs/prototype/LOCAL_APP_PLAN.md) — 本地应用实施决定
- [docs/prototype/COURSE_FORMAT.md](docs/prototype/COURSE_FORMAT.md) — 最小课程与运行结果约定
- [docs/tasks/TASKS.md](docs/tasks/TASKS.md) — 任务与交付状态
- [AGENTS.md](AGENTS.md) — Agent 协作规则

上游源码依据与许可见 [courses/tinyrenderer/SOURCE.md](courses/tinyrenderer/SOURCE.md)。本仓库自身采用 [MIT License](LICENSE)；课程中引用的上游源码授权核对仍待完成。

## 参与开发

动手前先读 [AGENTS.md](AGENTS.md)。要点：公共文档由主对话统一维护，课程改动限定 `courses/tinyrenderer/`，应用改动限定 `apps/local/**`，Review 默认只读固定快照；不要覆盖其他对话的成果，未经用户要求不自动新增对话或委派子 Agent。
