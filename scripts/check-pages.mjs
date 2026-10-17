import assert from 'node:assert/strict';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(fileURLToPath(new URL('../out/', import.meta.url)));
const { basePath } = JSON.parse(
  await readFile(path.join(directory, 'pages-manifest.json'), 'utf8'),
);
const origin = 'https://pages.example';
const errors = [];
let referenceCount = 0;

async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(folder, entry.name);
      return entry.isDirectory() ? walk(target) : target;
    }),
  );
  return files.flat();
}

async function checkReference(reference, fromFile) {
  const relative = path.relative(directory, fromFile).split(path.sep).join('/');
  const url = new URL(reference.replaceAll('&amp;', '&'), `${origin}${basePath}/${relative}`);
  if (url.origin !== origin) return;
  referenceCount++;
  const pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith(`${basePath}/`)) {
    errors.push(`${relative}: 缺少部署路径：${reference}`);
    return;
  }
  let target = path.resolve(directory, `.${pathname.slice(basePath.length)}`);
  if (target !== directory && !target.startsWith(directory + path.sep)) {
    errors.push(`${relative}: 引用了导出目录外的文件：${reference}`);
    return;
  }
  try {
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    await access(target);
  } catch {
    errors.push(`${relative}: 目标文件不存在：${reference}`);
  }
}

const files = await walk(directory);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    await checkReference(match[1], file);
  }
  if (/href=["'][^"']*\/keystatic(?:\/|["'])/.test(html)) {
    errors.push(`${path.relative(directory, file)}: 静态页面含有不可用的编辑器入口`);
  }
}
for (const file of files.filter((file) => file.endsWith('.css'))) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
    await checkReference(match[1], file);
  }
}
const articles = (await readdir(new URL('../content/articles/', import.meta.url))).filter((file) =>
  file.endsWith('.mdx'),
);
for (const file of articles) {
  await access(path.join(directory, 'read', file.slice(0, -4), 'index.html'));
}
for (const route of ['api', 'keystatic']) {
  assert(!files.some((file) => path.relative(directory, file).startsWith(route + path.sep)));
}
await access(path.join(directory, '.nojekyll'));
await access(path.join(directory, 'blueprint/navigation.js'));
await access(path.join(directory, 'blueprint/viewer.html'));
assert.equal(errors.length, 0, errors.join('\n'));
console.log(
  `通过：${htmlFiles.length} 个 HTML 文件、${articles.length} 篇文章、${referenceCount} 处本地资源/链接，部署路径 ${basePath || '/'}。`,
);
console.log('无失效文件引用，无 CMS/API 路由，已包含 .nojekyll、蓝图查看器与手势脚本。');
