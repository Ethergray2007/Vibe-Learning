# apps/local R1 固定快照

生成时间：2026-10-16T08:42:12.486Z
生成方式：`node apps/local/tools/manifest.mjs`
用途：本项目已关联 Git 仓库，当前初始提交尚未创建；此快照作为补充，R1 审查针对本清单与 `SOURCES.zip` 中的文件内容；比对方式 `node apps/local/tools/manifest.mjs --check`。
范围：apps/local/**（不含测试临时目录、生成的 exe、review/ 自身），加课程侧被应用读取的文件。
未包含：运行时产物（%LOCALAPPDATA%\VibeLearning\ 下的草稿与运行目录）、Node.js 与 MSYS2 工具链、课程目录本身的其他文件。
注意：`apps/local/VALIDATION.md` 是本快照生成时的验证记录，不是验收通过结论。

## 应用文件（apps/local/**）

- `apps/local/API.md` — 1409 字节 — `9c7a1b0e55a9873e…`
- `apps/local/README.md` — 3265 字节 — `3f503163a99ae759…`
- `apps/local/REVIEW_FIXES.md` — 3371 字节 — `4eb284f8decd9b45…`
- `apps/local/VALIDATION.md` — 3316 字节 — `e7fd737747caa3f1…`
- `apps/local/components.json` — 516 字节 — `d0ada54e59710099…`
- `apps/local/core.mjs` — 11320 字节 — `65fb23ffee7451b6…`
- `apps/local/dist/app.js` — 7316 字节 — `1697727b861468d5…`
- `apps/local/dist/assets/geist-cyrillic-ext-wght-normal-DjL33-gN.woff2` — 7420 字节 — `2317fa4bb293c9c0…`
- `apps/local/dist/assets/geist-cyrillic-wght-normal-BEAKL7Jp.woff2` — 15084 字节 — `6894439694946a58…`
- `apps/local/dist/assets/geist-latin-ext-wght-normal-DC-KSUi6.woff2` — 16512 字节 — `824f485b5d26e2f2…`
- `apps/local/dist/assets/geist-latin-wght-normal-BgDaEnEv.woff2` — 29400 字节 — `19f9c92546aa300c…`
- `apps/local/dist/assets/geist-vietnamese-wght-normal-6IgcOCM7.woff2` — 8004 字节 — `8fa40e5d24824773…`
- `apps/local/dist/assets/index-BdeTzcW0.css` — 62354 字节 — `3f273f032fda5acd…`
- `apps/local/dist/assets/index-DaSJssjc.js` — 382162 字节 — `e6177afbe47399e1…`
- `apps/local/dist/index.html` — 385 字节 — `a37dd3ef0b3a0004…`
- `apps/local/dist/style.css` — 3101 字节 — `e18689d60ae8ecf5…`
- `apps/local/index.html` — 286 字节 — `50a010f4ee6c8b99…`
- `apps/local/native/job-runner.cpp` — 3550 字节 — `df0bfa77c905e22e…`
- `apps/local/native/job-runner.exe` — 802389 字节 — `73129c0a64c9f013…`
- `apps/local/package-lock.json` — 270444 字节 — `19b10de248f2247f…`
- `apps/local/package.json` — 965 字节 — `e85b1d101f1978a6…`
- `apps/local/public/app.js` — 7316 字节 — `1697727b861468d5…`
- `apps/local/public/index.html` — 2413 字节 — `63380bdb8942f758…`
- `apps/local/public/style.css` — 3101 字节 — `e18689d60ae8ecf5…`
- `apps/local/server.mjs` — 20550 字节 — `c6ce644be43313a6…`
- `apps/local/src/App.tsx` — 22011 字节 — `48defbc130eb0943…`
- `apps/local/src/components/ui/alert-dialog.tsx` — 5615 字节 — `04033234148f413a…`
- `apps/local/src/components/ui/alert.tsx` — 2150 字节 — `8c73c76c70d0f837…`
- `apps/local/src/components/ui/badge.tsx` — 1922 字节 — `510f021997ea8215…`
- `apps/local/src/components/ui/button.tsx` — 3375 字节 — `08e5f87833c5db84…`
- `apps/local/src/components/ui/field.tsx` — 6257 字节 — `8e54d2838051eeb7…`
- `apps/local/src/components/ui/label.tsx` — 596 字节 — `344bde38b8531615…`
- `apps/local/src/components/ui/separator.tsx` — 620 字节 — `42aa6209fe9bec17…`
- `apps/local/src/components/ui/sonner.tsx` — 1226 字节 — `2dd975ad2170ba25…`
- `apps/local/src/components/ui/tabs.tsx` — 3548 字节 — `4441d00edc402539…`
- `apps/local/src/components/ui/textarea.tsx` — 832 字节 — `82601c91ffc6c727…`
- `apps/local/src/index.css` — 13452 字节 — `04dce08c8a8cea15…`
- `apps/local/src/lib/utils.ts` — 24 字节 — `14300d758170c270…`
- `apps/local/src/main.tsx` — 153 字节 — `675537ba7f61f267…`
- `apps/local/start.cmd` — 568 字节 — `8a4116c0897f03cb…`
- `apps/local/tests/client-state.mjs` — 1137 字节 — `b30ff23a3f5ebcf0…`
- `apps/local/tests/integration.mjs` — 24104 字节 — `0544984235762516…`
- `apps/local/tests/slow-compiler.cpp` — 941 字节 — `2fa7c0e15426c7d2…`
- `apps/local/tools/build-native.mjs` — 538 字节 — `f3b7278dcc72167b…`
- `apps/local/tools/manifest.mjs` — 7054 字节 — `7321eb8f0f64f373…`
- `apps/local/tsconfig.json` — 387 字节 — `96537cfe6775c3a5…`
- `apps/local/vite.config.ts` — 348 字节 — `0937b21fb7797e1a…`

## 课程侧被读取的文件（只读；不属于 apps/local 修改范围）

- `courses/tinyrenderer/level-01/lesson.md` — 4024 字节 — `557f74bdb0036ffb…`
- `courses/tinyrenderer/level-01/reference.cpp` — 192 字节 — `80094648c06dcbde…`
- `courses/tinyrenderer/level-01/starter.cpp` — 242 字节 — `6c9e96ed6b8a1235…`
- `courses/tinyrenderer/level-01/transfer.cpp` — 195 字节 — `d712edc258f4fd1b…`
- `courses/tinyrenderer/level-02/lesson.md` — 5137 字节 — `be83b66d5043f79b…`
- `courses/tinyrenderer/support/output.h` — 1061 字节 — `6504da7588be790d…`
- `courses/tinyrenderer/upstream/tgaimage.cpp` — 7036 字节 — `3bc38586967b8a32…`
- `courses/tinyrenderer/upstream/tgaimage.h` — 1416 字节 — `538a821617cde037…`

