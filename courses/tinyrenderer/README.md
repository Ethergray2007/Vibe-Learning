# TinyRenderer 前两关课程样例

状态：教学验证草稿；课程格式为**未确认提案**。只包含课程资料和配套验证代码。

阅读顺序：`SOURCE.md` → `level-01/lesson.md` → `FORMAT_PROPOSAL.md` → `level-02/lesson.md`。第一关完整样例和格式提案先落盘并编译，再制作第二关。

每关的 `starter.cpp` 为初始代码，`reference.cpp` 为主任务答案，`transfer.cpp` 为迁移答案。`upstream/main.cpp` 只保留作来源证据，**不要与课程 main 一起编译**。

## 手动运行第一关

前提：Windows 已有可用的 g++，无需下载依赖。以下命令在本目录执行，用 PowerShell；每条成功后再执行下一条。没有工具链时停止并交由应用专项处理。

```powershell
New-Item -ItemType Directory -Force artifacts/manual | Out-Null
g++ -std=c++17 -Wall -Wextra -I upstream -I support level-01/starter.cpp upstream/tgaimage.cpp -o artifacts/manual/run.exe
if ($LASTEXITCODE -ne 0) { throw '编译失败，请先修正错误' }
Push-Location artifacts/manual
try { .\run.exe; if ($LASTEXITCODE -ne 0) { throw '图片生成失败' } } finally { Pop-Location }
```

在浏览器打开 `artifacts/manual/preview.bmp`。先看到白点；按题面修改 starter.cpp、保存，重新执行编译和运行，再刷新图片看到红点。浏览器默认可能显示很小，应用最终应提供最近邻放大。文件浏览器预览只是课程作者检查方式，不等于应用流程已经开发完成。

第二关把命令中的 `level-01/starter.cpp` 换成 `level-02/starter.cpp`；查看答案时改用对应 reference.cpp。每次只编译一个入口文件。

## 作者验证

```powershell
python checks/verify.py
```

使用已有 Python 标准库与 g++，不安装包。输出在 `artifacts/`，重复执行会重建此目录中的同名课程产物；不会改动其他目录。验证失败返回非零；成功后生成 `artifacts/verification.txt` 与上游文件 SHA-256。

脚本验证初始图、主任务图、迁移图，比较 BMP 与 TGA 的每个像素与方向，穷举线段端点，并确认典型错误实现被拒绝。初始程序“能运行”与“完成任务”是不同结果。

最终验证状态见 `VALIDATION.md`，旧文档差异与交接见 `DECISIONS_AND_HANDOFF.md`。
