# R1 六项问题修复记录

日期：2026-10-16。状态：实现与针对性复测完成，待 Review 对话复核；不是独立审查通过结论。仅修改应用实现、测试和公共文档，未修改课程源码。

| 原问题 | 修复 | 本轮证据 |
| --- | --- | --- |
| P1 退出保存期间编辑导致丢失 | 点击退出即设置同步退出保护及退出中 UI；锁编辑、运行、保存、重置和答案操作；排队保存最终快照后关闭，失败恢复编辑 | Edge 延迟 PUT 响应，确认 editor/submit disabled、退出中提示可见；释放后正常退出，磁盘保留最新标记代码。截图 review/exit-save-locked.png |
| P2 正常主进程退出后遗留子进程 | 原生 job-runner 在挂起态把目标加入 Job Object，再运行；目标结束终止整个 Job，确认空组；宿主退出监视与 KILL_ON_JOB_CLOSE 收尾 | C++ 生成正确图并启动延迟写标记的自身子进程；提交 AC 后退出应用，等待超过子进程延时，标记仍不存在 |
| P2 会话写入覆盖硬链接目标 | session.json 改用同目录随机临时文件及原子替换，保留链接检查 | 独立数据根预建硬链接，启动后外部证据文件内容保持不变 |
| P2 固定材料缺失误判 CE | 编译前检查固定图像源/头文件、辅助文件及进程宿主，失败 SE；编译非零再复查依赖 | 临时应用副本环境通过后移走 tgaimage.cpp，正确提交返回 system_error/SE 与平台依赖说明 |
| P2 SE 被预览错误掩盖 | 进度保存失败清除 image 和缓存；前端图片读取/解码失败只提示预览问题，保留评测结果 | 故障数据令 learning.json 不可写，接口 SE/image=null；Edge 保留 SE 和进度失败提示；另拦截图片 404，AC 仍可见 |
| P2 新运行立即清除旧结果 | 保留至多 32 项终态/当前结果，终态最长 30 分钟；按 runId 返回图片，过期或淘汰明确 404 | 新运行完成后，旧运行仍可查询 success，旧图片仍 200；新图依然按当前 runId 显示 |

## 自动检查

npm run build 成功，包含编译 Windows 原生进程宿主、TypeScript 检查与 Vite 生产构建。

node --test apps/local/tests/integration.mjs apps/local/tests/client-state.mjs：24 项通过，0 失败，约 60 秒（包含 Node 父测试计数）。含真实 30 秒编译超时、3 秒执行超时及修复后恢复。

原生宿主代码 native/job-runner.cpp；构建脚本 tools/build-native.mjs；运行使用 native/job-runner.exe。编译器临时目录明确设为本次拥有目录，避免引入 Job 管理后写全局 Temp 被拒。本轮未降低超时要求。

## 未验证与限制

- Job Object 管理正常创建的进程树，不是完整文件、网络或权限沙箱；没有对借助外部系统服务启动进程等恶意绕过做保证。
- 程序结束后的普通后代终止及运行中退出已测；断电、操作系统崩溃、强杀全部组合仍不保证。
- 结果在当前服务内有界保留，不等于永久提交历史；关闭服务后历史仍待 M1/A2 实现。
- 干净 Windows、不同编译器及已安装版应用尚未验证。
- 第二关未接入。确认的接入决定见 docs/LEVEL02_DECISIONS.md。

进程组实现依据 Microsoft Job Objects 文档：https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects 。
