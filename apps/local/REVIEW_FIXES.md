# R1 修复及编译回归记录

日期：2026-10-16。独立复核已关闭退出保存竞争、会话硬链接覆盖、依赖误判 CE、SE 被图片错误掩盖、延迟轮询丢失结果五项。第 2 项发现 LocalAppData 编译回归，本轮修复并完成自动回归；尚未再次独立复核，不宣称六项已全部独立关闭。

## 编译回归修复

旧原生 job-runner.exe 的 CreateProcess 启动路径，在本机 LocalAppData 同类目录下使 g++ 临时文件写入被拒；Node 直接启动同一编译器可成功。具体操作系统权限机制未完全定位。

现由 Node 启动等待 IPC 许可的 native/worker.mjs，再通过 Node-API 模块 native/job-control.node 将 worker 加入 KILL_ON_JOB_CLOSE 的 Windows Job Object，分配成功后才许可启动编译器或学习者程序。保留正常结束、超时和退出的后代进程终止能力，避免旧原生启动路径。旧 job-runner 源码/产物已移除。

构建增加 node-api-headers 开发依赖；tools/build-native.mjs 生成原生模块。正式运行需同时包含模块与 worker，不能仅复制 dist。

## 验证

26 项检查全部通过，0 失败，约 91 秒；生产构建和 TypeScript 检查通过。包含 LocalAppData 独立数据根下编译、AC、CE、TLE、恢复和后代终止，以及原六项针对性回归。第二关独立正确实现、65,536 端点组合、多颜色/背景/连续线、错误实现、提前退出、死循环、接口缺失、两关独立存储与重启恢复通过。

原独立复核证据与退出竞争截图保留，详见 VALIDATION.md。课程源码未修改；用户真实草稿未触碰。

## 限制

Job Object 不是文件、网络或权限安全沙箱；本地 C++ 仍以用户权限执行，不保证恶意绕过或系统服务代启进程。干净 Windows、其他编译器、强杀/崩溃组合和安装版未验证。结果缓存不是跨重启的永久提交历史。
