# Starry手册创作约定

## 笔记生成与图表

- 用户于 2026-10-17 明确要求：后续项目笔记必须能快速生成，不能为单篇笔记长时间反复调整。内容准确、表达清楚和便于修改是前提。
- 日常创作以正文、节点关系和数据为输入，优先采用自动布局与可复用模板。样式、布局和交互在共享组件中统一处理，不把逐篇编写页面代码、手调坐标、SVG/CSS 或连线路径作为常规流程。
- 图表按当前内容的解释需要选择，例如架构与依赖、流程、时序、生命周期与状态、数据关系或时间线；只有帮助理解时才使用，不为展示图种数量增加图表。知识图谱、交互示例与 UE 节点展示沿用各自的实际用途。
- Archify 仅是用户提供的效果参考，不是必须接入的工具。工具选择以项目笔记需要、生成速度、可读性和后续修改成本为依据；不要把参考站点或调研建议记成用户已批准的技术选型。
- 新增图表能力应一次实现为可复用组件或生成模板，后续笔记只填写内容与少量必要参数。本地 MDX 与网页编辑应继续支持同一份内容；需要注册的正文组件同步接入 MDX 和 Keystatic。
- 普通内容更新只做必要的内容、链接和渲染检查；新增或修改模板、组件及出现显示问题时，再进行相应的视觉检查与调整。快速生成不省略内容正确性与必要验证，也不让每篇笔记重复经历组件开发和全站验收。

## 手册动效

- 用户于 2026-10-17 要求参考 Emil Kowalski 的设计思路，为手册提供动效。每处动效先明确用途与使用频率，优先表达操作反馈、选中状态和机制变化；正文阅读保持稳定，搜索与键盘操作直接响应。
- 共享时长与缓动统一维护在 `app/motion.css`。按压反馈默认 120 ms，状态过渡默认 160 ms，首页进场默认 240 ms；常规 UI 动效控制在 300 ms 内，优先使用先快后慢的缓动。
- 简单动效使用 CSS transition 或 `@starting-style`，需要程序控制时再考虑 WAAPI；只有实际需要弹簧、复杂布局或手势动画时才引入动效库。主要动画属性为 transform 与 opacity，小范围颜色变化可过渡，不逐帧改变页面布局。
- 悬停位移必须限定支持 hover 的精细指针；同时提供 prefers-reduced-motion，减少位移、缩放与持续移动，保留必要的颜色和透明度反馈。交互状态过渡可打断，不以播放动画阻塞操作。
- 动效随共享模板和组件复用，日常生成或修改笔记不增加动画配置。文章关系只表示阅读关联，不使用持续流动的连线暗示程序执行；蓝图平移缩放直接跟随输入。
- 参考来源与具体实现、验证记录写入本仓库 README；研究外部 skills 不等于安装它们或引入其运行依赖。

## 视觉风格与布局

- 用户于 2026-10-17 要求桌面浏览时画面更饱满，风格偏二次元、明快。首页、图谱和交互页面随窗口宽度展开，避免固定窄容器让内容集中在屏幕中央；阅读页利用导航、正文和关联信息组织空间，同时限制正文行宽。
- 主题色、纸片层次、星星装饰和响应式规则统一维护在共享样式与组件中。装饰不承载必要信息，不遮挡正文或交互，也不要求每篇笔记配置插画、坐标或页面样式。
- 视觉变化同步核对首页、阅读、图谱、实验、蓝图外层与搜索；桌面展开和手机适配共同维护。正文与操作状态保持清晰，蓝图节点维持其熟悉的 UE 画布表现。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
