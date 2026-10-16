# 最小课程与运行结果约定

更新：2026-10-17。当前约定覆盖完整代码编辑与前两关提交判题，替代旧 A1 局部编辑限制。

## 文档定位

本文是当前原型的内容/API 约定，不是完整第一版课程包标准。v0.3 的 .vlearn.zip、格式校验、版本、测试/答案资料、导入导出仍保留，正式包需另行定义。普通文件样例用于验证，不替代可迁移课程包目标。

## 内容文件

保留 courses/tinyrenderer/ 的 SOURCE.md、level-01/lesson.md、starter.cpp、reference.cpp、transfer.cpp、upstream/、support/、checks/。第二关按 APP_INTEGRATION_LEVEL02.md 已接入。作者验证工具不是应用接口。

固定上游版本以 SOURCE.md 为准：706b2dfecff65daeb93de568ee2c2bd87f277860，应用采用 C++17。课程 ID tinyrenderer，运行关卡 ID 为 level-01、level-02。

lesson.md 仍要求八个二级标题：目标、只学本题需要的 C++、任务与可修改范围、公开样例和完成条件、典型错误、逐级提示、答案解析、迁移练习：<题目名>。前七项名称与顺序固定，第八项校验前缀。解析失败明确报错，不回退全文。

## 前端展示

用户试用发现原题面混杂，改为应用内整理的题目描述、输入格式、输出要求、样例。题面契约与评测目标同步维护，不机械展示课程全文。

/api/state 的 lesson 只返回 knowledge（必要 C++）与 errors（易错点）；主任务简洁题面由前端呈现。答案解析和参考代码仅主动查看时返回。迁移练习暂未开放，不因 AC 宣称理解已经验证。

当前路线仅作学习导航：第一章从像素到线段；第二章绘制三角形；第三章走进三维空间；第四章让画面有质感。第一关可学习，第二关在第一关 AC 后解锁，其余规划中或后续方向。

## 完整代码与兼容

/api/state 返回 source（当前完整草稿）、starter（完整初始程序）、revision、passed、answerSeen。PUT /api/draft 以及 POST /api/run、/api/submit 请求为 {levelId, source, revision}；省略 levelId 兼容第一关。

不再接收 editable 片段，不提供 prefix/suffix。旧完整草稿仍保留并直接载入；无固定模板前后缀限制。空文件、超过 16 KB 或无法读取的草稿保留并提示。与其他页面发生版本冲突时拒绝静默覆盖。

完整提交只包括一个 C++ 主程序；upstream/tgaimage.cpp 单独编译，包含目录固定 upstream/ 和 support/。工具代码无需学员修改。

## 结果字段

| 字段 | 约定 |
| --- | --- |
| runId | 服务生成的唯一运行标识 |
| courseId / levelId | tinyrenderer / level-01 或 level-02 |
| mode | run 或 submit |
| sourceHash | 完整源文件 SHA-256 |
| status | compiling、running、success、compile_error、runtime_error、timeout、output_error、system_error |
| phase | compile、execute、output、judge |
| message / diagnostics | 可读说明与长度受限的日志 |
| exitCode | 阶段进程退出码，尚未取得为 null |
| startedAt / finishedAt | UTC ISO 8601；未结束 finishedAt 为 null |
| image | 有效图片时 {runId,url,width:16,height:16}；其他情况 null |
| judgment | 运行时 null；提交完成时 {verdict,checks,message?} |

编译 30 秒、执行 3 秒；提交接受后轮询 GET /api/run/<runId>。忙时 409，不增加队列。图片 URL 禁止缓存，旧图不得覆盖本次结果。

## 第一关判题

输出须是有效的 16×16 BMP/TGA，方向约定一致、全部像素一致。检查 (4,6) 为 RGB(255,0,0)，其他 255 个像素为 RGB(0,0,0)。比较像素值，不比较源文件或整文件摘要。

verdict：AC 正确、WA 像素或输出不符、CE 编译失败、RE 非零退出、TLE 超时、SE 平台或进度保存失败。checks 对合法图片返回两项检查结果及可读细节。

AC 后持久化 passed、passedAt、acceptedSourceHash，查看答案追加 answerSeen，后续 WA 不撤销历史通过。进度保存失败不假装已保存成功。答案查看不影响本次输出判题，但不作为独立完成的学习证据。

## 验证边界

目前是自学应用，无防作弊保证；输出通过不等于学习理解。历史源码授权、干净 Windows 环境和真人迁移练习效果仍待核实。接口实现说明见 apps/local/API.md，执行与访问边界见 docs/prototype/LOCAL_APP_PLAN.md。

## R1 补充与第二关决定

当前服务保留最近至多 32 个运行结果与图片，终态最长 30 分钟，过期/淘汰后返回明确 404。新运行不再立即清空旧结果。进度保存失败 SE 时 image=null；图片预览失败不能清空已有判题结果。

第二关确认采用精确取整、独立翻译单元、提交重命名入口和函数行为检查；见 docs/prototype/LEVEL02_DECISIONS.md。当前已按 levelId 分离草稿、进度、提交与判题规则；第一关通过后解锁第二关，宿主拒绝未解锁请求。

## 第二关接入补充

GET /api/state?levelId=level-02 返回选中关卡与两关 progress（passed/unlocked）。保存、运行、提交及查看答案均接受 levelId；省略兼容第一关。宿主对未解锁第二关返回 403。草稿与 learning.json 按关卡独立。

第二关运行普通 main；提交独立编译学习者翻译单元（COURSE_TEST 和 main 重命名只用于该单元），链接 native/line-judge.cpp。检查全局 line 接口，按精确半格向较大整数取整规则验证全部 65,536 端点组合，另加 12 次多色、背景与连续绘制调用。需要完成报告及匹配退出状态才 AC；正常不匹配 WA、异常/缺失报告 RE、超时 TLE、接口编译错误 CE。phase 可以为 judge；函数提交成功 image=null 是正常结果。
