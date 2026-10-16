# 本地接口（完整代码编辑版）

所有 /api/* 需要 X-Vibe-Token。非 GET 请求还需与当前 origin 完全一致的 Origin。服务只监听 127.0.0.1，校验 Host，响应 no-store。

- GET /api/state：环境、警告、完整 source、starter、revision、passed、answerSeen，以及知识区资料。没有完整题解或迁移答案。
- PUT /api/draft：{source,revision}，保存完整 C++；成功 {sourceHash,revision}。拒绝过期 revision、空代码和超过 16 KB 的代码。
- POST /api/run：{source,revision}，保存完整源文件并编译执行。成功 202 {runId,sourceHash,revision}；不判 AC。
- POST /api/submit：同上，额外检查第一关输出；judgment 为 AC/WA/CE/RE/TLE/SE。
- GET /api/run/<runId>：读取当前运行，字段以根目录 COURSE_FORMAT.md 为准。
- GET /api/image/<runId>：读取本次有效 BMP；旧图片 URL 404。
- POST /api/answer：{}，合并保存 answerSeen，返回 {text,code}，保留已通过状态。
- POST /api/shutdown：{}，返回退出说明并清理本会话。

错误响应 {error:{message}}；忙和版本冲突 409，鉴权 403，缺失接口 404，平台问题 500 或 503。完整说明以根目录 COURSE_FORMAT.md、LOCAL_APP_PLAN.md 为准。

旧 editable/prefix/suffix 片段协议已由用户要求的完整文件编辑替代；旧 UI 不可连接新版服务，请重启并刷新页面。
