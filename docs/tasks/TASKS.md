# 任务与交付状态

更新：2026-10-17。历史任务记录保存在 docs/archive/TASKS_before_shadcn.md。

| ID | 任务 | 当前状态 | 范围与证据 |
| --- | --- | --- | --- |
| P0 / P1 / P2 | 本地版规划、课程组织与执行方案 | 已确认；按新试用反馈修订 | docs/product/PROJECT_PLAN.md、docs/prototype/COURSE_FORMAT.md、docs/prototype/LOCAL_APP_PLAN.md |
| C1 | 第一关课程与固定上游资料 | 资料交付 | courses/tinyrenderer/；授权核对仍待完成 |
| C2 | 第二关课程 | 已接入应用；课程资料保持原样 | docs/prototype/LEVEL02_DECISIONS.md；保留精确规则、独立编译、函数判题 |
| A1 | 第一关本地运行闭环 | 已实现，有构建、编译与浏览器证据 | apps/local/；详见 apps/local/VALIDATION.md |
| V1 初次试用 | 发起者试写第一关 | 已收到反馈 | 题面混杂、局部编辑、无 AC；用户要求 shadcn 和章节路线 |
| A1-UX | 根据试用重做界面、完整代码与第一关判题 | 已实现；20 项检查全部通过 | 主对话修改 apps/local/** 和公共规划；真实浏览器 WA→AC、BMP、保存恢复、路线、窄屏通过 |
| R1 | 独立审查固定版本 | 独立复核关闭五项；第 2 项编译回归本轮修复并回归通过，未再次独立复核 | apps/local/REVIEW_FIXES.md；26 项检查通过；包含 LocalAppData 路径和第二关 |
| V1 再试用 | 发起者体验新界面并验证理解 | 待进行 | 重启应用，独立完成第一关；AC 不等于迁移理解已验证 |
| A2 | 第二关执行、迁移、进度解锁及导出 | 第二关执行、函数判题与解锁已实现；迁移练习、导出待做 | 两关草稿/进度分离，浏览器运行→WA→AC通过 |

## 产品范围校正（用户最新澄清）

docs/product/PROJECT_PLAN.md v0.6 恢复 v0.3 完整产品需求，主要变化为本地部署。下列都是待实现，不是取消：GitHub/AI 制课、模板、课程包导入导出、内容编辑/审核/发布/版本、多题型、提交历史、多学习者独立记录、插件/SDK/MOD。当前 A1/A2 编号只是验证阶段任务，不是完整第一版验收。

完整里程碑：M1 本地学习评测；M2 课程内容及包迁移；M3 AI 制课；M4 插件与可扩展第一版。按用户最新决定优先开发，阻塞启动、草稿保存或判题的错误先修，其余记录后继续推进；再依赖拆分，不因此自动启动所有开发。

## 当前决定

本轮用户明确要求精简题面、开放整份代码、正确答案绿色 AC、使用 shadcn/ui、看到后续章节，替代历史 A1 局部编辑和不判题约束。主对话已同步产品、课程和本地方案文档。

前端为 React/Vite/Tailwind/shadcn（Radix），本地 Node.js + g++ 保留。源码 apps/local/src/，生产资源 dist/，旧 public/ 不再作为入口。只修改应用与公共规划，没有修改课程源码。

章节路线可查看目标与开放状态：第一关可学习，通过后解锁第二关，三角形、三维及光照纹理仍为计划。不得宣称后续章节已经实现。

详细本轮测试及未验证项以 apps/local/VALIDATION.md 为准。旧 handoff/A1-app.md、review/_run-tests.log 与归档中的失败记录是历史证据，不是当前结果。

## 协作规则

主对话维护公共文档。应用专项修改 apps/local/**，课程专项修改 courses/tinyrenderer/，Review 默认只读固定快照。后续修改不要覆盖本轮用户决定，公共格式变化先回报。未经用户要求不自动创建新对话或委派 Agent。

## 仓库与本轮修复

本地 main 分支已关联 https://github.com/Ethergray2007/Vibe-Learning.git，远程别名为 main（不是 origin）。当前已有提交；2026-10-17 检查时 HEAD 为 f3fe633（补充 README 项目说明与文档导航）。本轮不自动提交或推送。已新增 .gitignore，排除依赖、运行凭据/草稿、临时测试数据、编译产物和生成压缩包。

R1 修复由主对话在 apps/local/** 完成；新的快照供复核，不覆盖“独立审查暂不通过”的事实。第二关决定已写入 docs/prototype/LEVEL02_DECISIONS.md，本轮已集成，详见 apps/local/VALIDATION.md。

## 2026-10-17 文档整理

主对话允许修改 README.md、docs/ 当前公共文档，以及 apps/local/ 的文档引用、注释和快照工具说明。已清除三份公共文档中的合并标记，保留第二关实际接入结果与新文档路径；第二关决定迁至 docs/prototype/LEVEL02_DECISIONS.md。旧课程作者交付与归档保留历史状态。未改学习功能、课程源码或已有暂存内容；未提交/推送。
