# 源码与教学依据

核对日期：2026-10-16。来源是作者维护的官方仓库和官方教程，不以第三方转述作为代码依据。

- 仓库：https://github.com/ssloy/tinyrenderer
- **固定提交：`706b2dfecff65daeb93de568ee2c2bd87f277860`**
- 提交标题：`Let us start from here`；作者 Dmitry V. Sokolov；提交作者时间 2025-02-22T07:17:33Z。
- 固定树：https://github.com/ssloy/tinyrenderer/tree/706b2dfecff65daeb93de568ee2c2bd87f277860
- 官方第二版简介：https://haqr.eu/tinyrenderer/
- 官方第二版线段教程：https://haqr.eu/tinyrenderer/bresenham/
- 旧 Wiki：https://github.com/ssloy/tinyrenderer/wiki/Lesson-1%3A-Bresenham%E2%80%99s-Line-Drawing-Algorithm

选择理由：当前官方 README 的 starting point 指向该提交，且它只需图像读写与逐像素操作，适合前两关。没有选择会继续变化的 master，也没有把完整版渲染器当作初始工程。旧 Wiki 已明确提示文本过时、转向第二版；不混用旧版颜色构造方法。

## 本地快照与定位

| 文件 | 官方 Git blob | 课程使用的事实 |
| --- | --- | --- |
| upstream/main.cpp | 3edda53669929fec5748264f67827c5641f3b7e7 | `constexpr TGAColor` 的 BGRA 常量、`framebuffer.set`、保存图片的入口 |
| upstream/tgaimage.h | 937aaffd92505d5de4e6030011243c29f3c81b6c | `TGAColor::bgra`；`TGAImage`、`set/get`；保存参数默认值 |
| upstream/tgaimage.cpp | e23883cf5492bd53ac4fd757b10868e0012ba0fa | `set` 忽略越界；`write_tga_file` 的方向位与未压缩输出 |

文件保持下载原样；SHA-256 见 `upstream-sha256.json`。固定文件可从上述提交树访问，不依赖易变行号。教程网页只记录查阅日期，未声明其网页版本不可变；可执行行为以本地快照和本课契约为准。

## 改编范围

第一关把原始画布缩为 16×16，三个点缩为一个点，集中观察颜色变化。第二关采用等步数插值作为基础线段练习，与作者循序改进采样的思路关联；并非照搬完整官方章节或整数 Bresenham 最终实现。讲解为本课程重新编写。

`support/output.h` 为课程新增辅助代码：保存 `framebuffer.tga` 时传入 `false,false`，明确左上角原点、无压缩；再从同一像素数据输出 BMP，便于浏览器显示。没有修改官方图像类，没有使用新版/旧版混合接口，没有新增项目依赖。

## 许可核对状态

固定提交的根目录树未包含 LICENSE 文件，直接读取该提交的 LICENSE 返回 404。保留作者与来源信息，不自行宣称该历史快照为 MIT 或推定后续许可证追溯适用。当前为内部课程验证资料；对外分发前需要核实该提交源码的授权范围并补齐许可文本。此项尚未完成，不影响本次明确报告的本地技术验证结果。
