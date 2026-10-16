# 文档导航

本目录存放 Vibe Learning 的公共文档。根目录只保留 README.md、AGENTS.md 和 LICENSE；模块内文档跟随各自模块目录（apps/local/、courses/tinyrenderer/），不集中到这里。

## 分层

对应 docs/product/PROJECT_PLAN.md 第 0 节要求的三层区分：

| 层次 | 目录 | 回答的问题 |
| --- | --- | --- |
| 完整产品与第一版目标 | docs/product/ | 最终要做成什么，哪些不能被原型限制掉 |
| 当前原型实现与约定 | docs/prototype/ | 现在实际实现了什么，接口与判题怎么约定 |
| 这一轮做什么 | docs/tasks/ | 当前任务、状态与验收证据 |
| 历史追溯 | docs/archive/ | 已废弃的规划与旧验收记录，只读参考 |

## 文档清单

### product/ — 完整产品与第一版目标

| 文档 | 内容 | 状态 |
| --- | --- | --- |
| [PROJECT_PLAN.md](product/PROJECT_PLAN.md) | 产品与实施规划 v0.6：定位、用户与场景、核心流程、第一版范围、AI 分析与出题流程、模板设计、课程包格式、发布与更新、本地技术方案、数据对象、里程碑 M1～M4、风险 | 当前功能基线 |
| [PLUGIN_ARCHITECTURE.md](product/PLUGIN_ARCHITECTURE.md) | 插件与模块架构规划 v0.2：扩展点与替换规则、插件清单、安装更新停用、版本锁定、运行与权限模型、SDK 交付物、代码组织 | 保留需求，尚未实现 |

### prototype/ — 当前原型实现与约定

| 文档 | 内容 | 状态 |
| --- | --- | --- |
| [LOCAL_APP_PLAN.md](prototype/LOCAL_APP_PLAN.md) | 本地应用实施决定：技术方案、页面与路线、执行与判题、保存与访问边界、验收项、R1 修复补充 | 描述当前实现 |
| [COURSE_FORMAT.md](prototype/COURSE_FORMAT.md) | 最小课程与运行结果约定：lesson.md 八标题契约、`/api/state` 字段、前两关像素/函数判题、结果字段表、验证边界 | 描述当前实现 |

### tasks/ — 当前任务

| 文档 | 内容 | 状态 |
| --- | --- | --- |
| [TASKS.md](tasks/TASKS.md) | 任务与交付状态表、产品范围校正、当前决定、协作规则、仓库状态 | 每轮开工先读 |

### prototype/ 补充决定

| 文档 | 内容 |
| --- | --- |
| [LEVEL02_DECISIONS.md](prototype/LEVEL02_DECISIONS.md) | 第二关接入决定：精确取整规则、独立翻译单元与函数判题、A2 必须处理的集成边界 |

### archive/ — 历史追溯（只读，内容与其中路径保持原样）

| 文档 | 说明 |
| --- | --- |
| [PROJECT_PLAN_v0.3.md](archive/PROJECT_PLAN_v0.3.md) | 云端平台版完整需求，v0.6 的功能基线 |
| [PROJECT_PLAN_v0.5.md](archive/PROJECT_PLAN_v0.5.md) | 被 v0.6 纠正的收缩版规划 |
| [LOCAL_APP_PLAN_A1.md](archive/LOCAL_APP_PLAN_A1.md) | 旧 A1 本地应用方案 |
| [TASKS_before_shadcn.md](archive/TASKS_before_shadcn.md) | 引入 shadcn/ui 之前的任务表 |
| [A1_VALIDATION_before_shadcn.md](archive/A1_VALIDATION_before_shadcn.md) | 旧 A1 验收记录 |

## 模块内文档

| 位置 | 文档 |
| --- | --- |
| apps/local/ | README.md（启动与使用）、API.md（本地接口）、VALIDATION.md（验证记录）、REVIEW_FIXES.md（R1 六项修复）、review/SNAPSHOT.md（定版快照清单） |
| courses/tinyrenderer/ | README.md（手动运行与作者验证）、SOURCE.md（源码依据与授权状态）、FORMAT_PROPOSAL.md（未确认的格式提案）、VALIDATION.md、DECISIONS_AND_HANDOFF.md、APP_INTEGRATION_LEVEL02.md、level-01/level-02 的 lesson.md |
| handoff/ | A1-app.md、A1-course.md（历史专项任务书） |

## 路径迁移对照

公共文档已从根目录迁入 docs/ 子目录，旧路径对照：

| 旧路径 | 新路径 |
| --- | --- |
| PROJECT_PLAN.md | docs/product/PROJECT_PLAN.md |
| PLUGIN_ARCHITECTURE.md | docs/product/PLUGIN_ARCHITECTURE.md |
| LOCAL_APP_PLAN.md | docs/prototype/LOCAL_APP_PLAN.md |
| COURSE_FORMAT.md | docs/prototype/COURSE_FORMAT.md |
| TASKS.md | docs/tasks/TASKS.md |

已同步更新引用的文件：AGENTS.md、docs/product/PROJECT_PLAN.md、docs/product/PLUGIN_ARCHITECTURE.md、docs/prototype/LOCAL_APP_PLAN.md、docs/prototype/COURSE_FORMAT.md、docs/tasks/TASKS.md、docs/prototype/LEVEL02_DECISIONS.md。

历史路径处理：docs/archive/**、handoff/** 与课程作者交付记录按原样保留，可按上表换算。交付记录描述当时状态，不代表当前应用状态；当前前两关接入情况以 tasks/TASKS.md、prototype/COURSE_FORMAT.md 和应用 VALIDATION.md 为准。

2026-10-17 已修正文档合并残留、第二关接入状态、Node-API 进程组方案，以及应用中的旧文档指引。第二关决定归入 prototype/；应用 review 快照重新生成。历史审查结论不自动升级为本次验收通过。
