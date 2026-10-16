# 本地接口（前两关）

所有 /api/* 需要 X-Vibe-Token。非 GET 请求还需精确 Origin。只监听 127.0.0.1，校验 Host，响应 no-store。

- GET /api/state?levelId=level-01：环境、当前 levelId、完整 source/starter、revision、passed、answerSeen、知识区，以及两关 progress（passed/unlocked）。省略 levelId 默认为第一关。
- PUT /api/draft：{levelId,source,revision}，成功 {sourceHash,revision}。拒绝过期 revision、空文件及超过 16 KB；每关独立保存。
- POST /api/run：同上，保存快照并执行普通 main，生成 BMP 预览，不判 AC。
- POST /api/submit：同上，第一关检查图片像素；第二关独立编译检查器并调用 line，AC 可返回 image=null。
- GET /api/run/<runId>：读取运行结果。最多保留 32 项，终态最长 30 分钟；新运行不会立即删除旧结果。
- GET /api/image/<runId>：读取该运行有效 BMP；无图片、淘汰或过期返回 404。
- POST /api/answer：{levelId}，保存当前关 answerSeen，返回 {text,code}。
- POST /api/shutdown：{}，等待保存队列并清理本会话。

省略请求 levelId 兼容第一关。仅允许内置 level-01/level-02；未解锁第二关返回 403。编译总限时 30 秒，执行/函数判题 3 秒，忙时 409。第二关 phase 包含 judge。返回结构详见docs/prototype/COURSE_FORMAT.md。

错误响应 {error:{message}}；版本冲突 409，鉴权/关卡锁定 403，缺失资源 404，平台问题 500/503。不是正式课程包插件 API。
