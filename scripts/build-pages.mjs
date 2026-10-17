import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { 'base-path': { type: 'string', default: '' } } });
const basePath = values['base-path'].replace(/\/+$/, '');
if (
  !/^(?:\/[A-Za-z0-9._-]+)*$/.test(basePath) ||
  basePath.split('/').some((part) => part === '.' || part === '..')
) {
  throw new Error('部署路径应为 /仓库名，例如 --base-path /starry-manual；域名根目录可省略。');
}

const require = createRequire(import.meta.url);
const build = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
  cwd: new URL('../', import.meta.url),
  stdio: 'inherit',
  env: { ...process.env, STARRY_STATIC_EXPORT: '1', STARRY_BASE_PATH: basePath },
});
const code = await new Promise((resolve, reject) => {
  build.once('error', reject);
  build.once('exit', resolve);
});
if (code !== 0) process.exit(typeof code === 'number' ? code : 1);

await writeFile(new URL('../out/.nojekyll', import.meta.url), '');
await writeFile(
  new URL('../out/pages-manifest.json', import.meta.url),
  JSON.stringify({ basePath }, null, 2) + '\n',
);
console.log(`静态文件已生成到 out/，部署路径：${basePath || '/'}。`);
console.log('运行 pnpm check:pages 检查文件，pnpm preview:pages 启动纯静态预览。');
