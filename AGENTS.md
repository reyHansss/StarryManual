# Starry手册创作约定

## 笔记生成与图表

- 用户于 2026-10-17 明确要求：后续项目笔记必须能快速生成，不能为单篇笔记长时间反复调整。内容准确、表达清楚和便于修改是前提。
- 日常创作以正文、节点关系和数据为输入，优先采用自动布局与可复用模板。样式、布局和交互在共享组件中统一处理，不把逐篇编写页面代码、手调坐标、SVG/CSS 或连线路径作为常规流程。
- 图表按当前内容的解释需要选择，例如架构与依赖、流程、时序、生命周期与状态、数据关系或时间线；只有帮助理解时才使用，不为展示图种数量增加图表。知识图谱、交互示例与 UE 节点展示沿用各自的实际用途。
- Archify 仅是用户提供的效果参考，不是必须接入的工具。工具选择以项目笔记需要、生成速度、可读性和后续修改成本为依据；不要把参考站点或调研建议记成用户已批准的技术选型。
- 新增图表能力应一次实现为可复用组件或生成模板，后续笔记只填写内容与少量必要参数。本地 MDX 与网页编辑应继续支持同一份内容；需要注册的正文组件同步接入 MDX 和 Keystatic。
- 普通内容更新只做必要的内容、链接和渲染检查；新增或修改模板、组件及出现显示问题时，再进行相应的视觉检查与调整。快速生成不省略内容正确性与必要验证，也不让每篇笔记重复经历组件开发和全站验收。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
