# 任务书 · 课程设计专项

下发：2026-10-16 主对话。任务编号 C2（标题约定对齐部分）。
状态：**已完成并经主对话复核**（保留作记录，不要重新执行）。

## 目标

让第二关符合主对话已确认的教学标题约定，使应用解析器能同时解析两关。

## 必读

COURSE_FORMAT.md（第 3 节标题约定、第 5 节运行字段）、courses/tinyrenderer/level-02/lesson.md、
courses/tinyrenderer/level-01/lesson.md、courses/tinyrenderer/SOURCE.md、
courses/tinyrenderer/VALIDATION.md、courses/tinyrenderer/DECISIONS_AND_HANDOFF.md。

## 背景

应用解析器 apps/local/core.mjs 要求每关 lesson.md 的二级标题数量恰好 8 个、顺序固定；
level-02 原为 9 个且名称不同，会导致应用停止题面展示。这是已确认约定，不是可协商项。

## 任务

1. 把 level-02/lesson.md 的二级标题改为：目标 / 只学本题需要的 C++ / 任务与可修改范围 /
   公开样例和完成条件 / 典型错误 / 逐级提示 / 答案解析 / 迁移练习：倒着画一条陡线。
   映射：「目标与方法」→ 目标（方法与范围并入正文）；「必需的 C++ 与计算解释」→ 第 2 个
   （内容不得删减）；「任务与边界」→ 第 3 个；「公开样例」+「检查与预期图像」合并进第 4 个；
   「典型错误与定位」→ 第 5 个；第 6、7、8 个不变。不得引入第 9 个二级标题。
2. 标题之外的内容、样例表、检查规则、提示措辞保留或改进，不因改标题删内容。
3. 重新运行 python checks/verify.py；按需同步脚本中的标题断言。
4. 交付报告：改动与原因、验证命令与结果、未验证项、需要主对话决定的事项。

## 边界

- 只改 courses/tinyrenderer/level-02/ 与必要的 checks/ 脚本。
- 不改根目录公共文件、不改 level-01 任何文件、不改 upstream/ 快照。
- 不改 COURSE_FORMAT.md 的格式约定；认为与 FORMAT_PROPOSAL.md 冲突时先报告。

## 交付结果（主对话复核）

- 两关 lesson.md 均恰好 8 个二级标题、0 个三级标题，前 7 个逐字一致，第 8 个以
  「迁移练习：」开头并带各自题目名。
- 主对话重跑 python checks/verify.py：exit 0，21 项全部 PASS，含新增的两关标题回归断言、
  六份程序 BMP/TGA 逐像素比对、65,536 种端点穷举、9 个错误变体被拒。
- upstream 三份文件 SHA-256 与 upstream-sha256.json 一致，快照未被改动。
- 遗留：第二关尚未接入应用；真人学习未验收。
