# 第三方来源

## blueprintUE self-hosted edition

- 上游：<https://github.com/blueprintue/blueprintue-self-hosted-edition>
- 固定提交：`a678b80cc54e01fbaeedb17bb44d3cc2558cd7b4`
- 使用文件：上游 `www/bue-render/render.js`、`www/bue-render/render.css`，本地位于 `public/vendor/blueprintue/`。
- 许可证：MIT，完整原文保留在 `public/vendor/blueprintue/LICENSE`。
- 渲染器文件原样保存，样式隔离与加载逻辑在自有 `public/blueprint/viewer.html` 中维护；左键、滚轮与触摸导航在自有 `public/blueprint/navigation.js` 中通过公开的 `moveTo` 接口适配。
- 使用上游 `window.blueprintUE.render.Main` API；没有部署其 PHP/数据库服务，也没有向 blueprintUE 公共服务上传节点。
- `public/blueprint/samples/begin-play.txt` 为本 demo 手写的教学节点文本，不来自项目资产。

## npm 依赖

Next.js、React、Fumadocs、Keystatic、React Flow、Lucide、Tailwind CSS 及其传递依赖由 pnpm 安装。版本记录在 `package.json` 与 `pnpm-lock.yaml`，许可证保留在各依赖包内。
