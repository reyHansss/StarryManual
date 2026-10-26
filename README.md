# Starry手册

Starry 游戏项目的使用与开发手册，按模块与子功能整理功能用法、配置、技术架构和排查说明。

**[在线阅读](https://reyhansss.github.io/StarryManual/)**

## 主要功能

- 模块化文档、全文搜索与关联阅读。
- 可拖动、缩放的关系图谱，支持模块与局部关系浏览。
- 正文流程图、时序图、状态图及 UE 蓝图节点展示。
- MDX 文件与本地网页编辑器修改同一份内容，蓝图支持可视化排版。

## 本地运行与编辑

环境：Node.js 24、pnpm 11，具体 pnpm 版本由 `package.json` 指定。

```powershell
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:3210>，通过“编辑内容”或“编辑本页”进入网页编辑器，也可直接修改 `content/articles/` 下的 MDX 文件。

## 构建与发布

```powershell
pnpm build:pages --base-path /StarryManual
pnpm check:pages
pnpm preview:pages --port 3211
```

静态预览：<http://127.0.0.1:3211/StarryManual/>。预览页中的编辑入口需要本地开发服务同时运行。

推送到 `main` 后，GitHub Actions 自动检查、构建并发布到 GitHub Pages，也支持手动触发。发布产物为 `out/`，线上站点为静态网页，网页编辑器在本地使用。

## 技术栈

Next.js、React、Fumadocs、Keystatic、React Flow、d3-force、Mermaid 和 blueprintUE。

第三方来源与许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
