# Vibe Learning 本地应用

当前提供 TinyRenderer 前两关：简洁题面、完整 C++ 编辑、运行预览、提交评测与绿色 AC。课程路线展示章节目标和开放状态；第一关 AC 后解锁第二关基础线段。

## 启动

前端已经构建到 dist/，双击 start.cmd 即可启动。已有旧版本服务时先在旧页面点击退出应用，再重新启动。

修改前端或首次从源码准备时，在 apps/local/ 执行：

```powershell
npm ci
npm run build
```

前端使用 React、Vite、Tailwind CSS 和官方 shadcn/ui Radix 组件。源码在 src/，服务只提供 dist/；旧 public/ 已不再使用。首次安装开发依赖需要网络，完成构建后的学习和评测不需要联网。

要求 Windows、Node.js 24+、MSYS2 UCRT64 g++（默认 C:\msys64\ucrt64\bin\g++.exe）。其他编译器位置可用 VIBE_CPP 指定绝对路径。应用不自动安装编译器。

## 使用

- 题目描述：只看任务、输入、输出、样例。
- 知识与提示：查看必要 C++ 和易错点。
- 题解：主动查看完整参考实现，记录已看答案。
- 完整 main.cpp 可编辑；支持 Tab 缩进、自动保存、手动保存和重置确认。
- 运行：查看实际图片，不产生 AC。
- 提交评测：检查 (4,6) 是否纯红，其他 255 像素是否黑色。正确为绿色 AC；错误为 WA，语法错误 CE，运行异常 RE，超时 TLE，平台问题 SE。
- Ctrl+Enter 提交。通过状态保存到本机，后续错误不会撤销。
- 第二关：运行观察线段图片，提交直接检查 line 函数，AC 无需生成图片。
- 课程路线：查看章节和开放状态，切换前两关练习。
- 保存并退出：保存当前代码并停止本地服务。关闭浏览器本身不会结束服务。

## 保存与执行边界

草稿与进度在 %LOCALAPPDATA%/VibeLearning/drafts/tinyrenderer/<levelId>/。旧完整源文件直接恢复，不再限制模板固定部分。并行页面发生保存冲突时保留页面文字并报错，请复制未保存内容后重新载入。

每次运行是不可变快照，图片显示与 runId 对应。编译最多 30 秒、运行 3 秒。异常退出遗留目录保留并提示。工作目录与超时不是完整 C++ 安全沙箱。

## 维护

在项目根目录运行：

```powershell
node --test apps/local/tests/integration.mjs apps/local/tests/client-state.mjs
node apps/local/tools/manifest.mjs
node apps/local/tools/manifest.mjs --check
```

集成测试用独立临时数据，不覆盖用户草稿。编译超时用例会等待 30 秒。client-state.mjs 现为像素判题回归测试，不再使用旧 DOM 模拟。

真实浏览器验证与未完成项见 VALIDATION.md；截图和固定快照见 review/。不宣称已在干净 Windows 环境开箱验证。

## R1 修复版本

构建会使用本机 g++ 和 node-api-headers 编译 native/job-control.node；配合 native/worker.mjs 管理运行进程组。首次克隆后请执行 npm ci 和 npm run build；不要只构建前端或直接复制 dist。正常程序结束也会终止它启动的普通子进程，这不构成完整沙箱。

点击退出立即锁编辑直到保存完成；失败恢复操作。当前服务保留至多 32 次运行结果，终态最多 30 分钟，尚不是跨重启提交历史。详情见 REVIEW_FIXES.md。
