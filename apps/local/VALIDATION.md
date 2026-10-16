# 本地应用验证记录

更新：2026-10-16。对象：完整代码编辑、shadcn/ui、第一关提交判题与课程路线版本。旧 A1 报告见 docs/archive/A1_VALIDATION_before_shadcn.md。

## R1 修复后的最新结论

24 项检查通过，0 失败；原生进程宿主、类型检查和生产构建通过。真实 Edge 延迟退出保存时编辑器锁定，最终磁盘保留最新代码；图片读取失败保留 AC，进度写入失败保留 SE。细节与未验证项见 REVIEW_FIXES.md。下方 20 项结果是修复前记录，不是当前测试总数。

## 本轮自动检查

- npm run build：TypeScript 检查和 Vite 生产构建通过。
- node --test apps/local/tests/integration.mjs apps/local/tests/client-state.mjs：20 项通过、0 失败，耗时约 52 秒（Node 报告包括父测试）。
- 真实 g++ 编译白点与红点，BMP 方向和 runId/no-store 检查通过。
- 运行不判 AC；提交白点、蓝点、交换坐标、额外非黑像素得到 WA；不同变量名的正确完整程序得到 AC。
- AC 持久化、查看答案保持 AC、后续 WA 不撤销通过、重启恢复完整源文件和答案标记通过。
- 编译错误 CE、非零退出、执行超时及恢复、缺失或损坏输出、旧保存冲突、保存失败保护、忙时拒绝、单实例、环境缺失提示通过。
- 真实等待 30 秒的编译超时通过。修正测试代理：使用真实探测 exe，宽字符 Windows 路径；环境探测文件放在所属会话目录，解决原全局 Temp 写入拒绝，未放宽超时断言。
- 完整文件编辑恢复、遗留目录保留、日志长度、链接越界与题目解析检查通过。
- 像素判题回归覆盖红点 AC、白/蓝 WA、坐标交换/上下翻转 WA、额外非黑背景 WA。

## 真实浏览器

使用 agent-browser 独立会话和本机 Edge，测试数据在 apps/local/tests/ui-data/，不覆盖实际用户草稿。

已操作：默认题面、初始白点提交 WA、将整个程序替换为使用 canvas/red 变量的正确代码、提交 AC、浏览器 BMP 解码与绿色弹出提示、路线进度显示、保存退出并重启恢复完整代码和已通过状态。

已检查桌面与 390×844 布局：题目页与路线页 documentElement.scrollWidth 均未超过 innerWidth。浏览器 console 没有输出错误。

截图：review/first-level-ac.png、course-roadmap.png、first-level-mobile.png、course-roadmap-mobile.png。截图仅为本轮试验数据，不代表用户已完成学习。

## 未验证与限制

- 干净 Windows 安装和其他编译器未验证。
- Ctrl+Enter/Tab、重置确认及真实浏览器多页面保存冲突未逐项人工操作；相关代码或服务端检查不代替真人验证。
- 强制结束服务后的孤儿进程清理没有保证；异常目录继续保留并提示。
- 第二关执行、迁移练习、学习记录导出尚未实现。
- 源码授权与真人学习效果尚未验证。
- 本轮不是独立 R1 审查，固定快照生成后仍可由 Review 对话只读检查。

快照由 tools/manifest.mjs 生成，包含构建资源和实际编译依赖，排除 node_modules、临时运行数据及 review 自身。原 review/_run-tests.log 是旧版本记录，不作为本轮测试结果。
