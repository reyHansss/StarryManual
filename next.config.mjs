import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const staticExport = process.env.STARRY_STATIC_EXPORT === '1';
const basePath = staticExport ? (process.env.STARRY_BASE_PATH ?? '') : '';

export default withMDX({
  reactStrictMode: true,
  devIndicators: false,
  // 本地编辑路由使用专用扩展名，静态发布时不生成编辑器或写入接口。
  pageExtensions: staticExport ? ['tsx', 'ts'] : ['local.tsx', 'local.ts', 'tsx', 'ts'],
  ...(staticExport && {
    output: 'export',
    trailingSlash: true,
    typescript: { tsconfigPath: 'tsconfig.pages.json' },
  }),
  basePath,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_STARRY_STATIC_EXPORT: String(staticExport),
    NEXT_PUBLIC_STARRY_BASE_PATH: basePath,
  },
  turbopack: { root: import.meta.dirname },
});
