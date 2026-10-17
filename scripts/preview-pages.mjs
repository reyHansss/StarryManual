import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { port: { type: 'string', default: '3211' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须为 1–65535。');
const directory = path.resolve(fileURLToPath(new URL('../out/', import.meta.url)));
const { basePath } = JSON.parse(
  await readFile(path.join(directory, 'pages-manifest.json'), 'utf8'),
);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// 只按磁盘文件响应；不存在的路由返回真正的 404，不回退到首页或 Next 服务。
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const notFound = async () => {
    console.warn(`404 ${request.url}`);
    response.writeHead(404, { 'Content-Type': mime['.html'] });
    response.end(
      request.method === 'HEAD' ? undefined : await readFile(path.join(directory, '404.html')),
    );
  };
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    if (basePath && pathname === basePath) {
      response.writeHead(301, { Location: `${basePath}/${url.search}` }).end();
      return;
    }
    if (!pathname.startsWith(`${basePath}/`)) return await notFound();
    let target = path.resolve(directory, `.${pathname.slice(basePath.length)}`);
    if (target !== directory && !target.startsWith(directory + path.sep)) return await notFound();
    let info = await stat(target);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      target = path.join(target, 'index.html');
      info = await stat(target);
    }
    if (!info.isFile()) return await notFound();
    response.writeHead(200, {
      'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(target).pipe(response);
  } catch {
    await notFound();
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`纯静态预览：http://127.0.0.1:${port}${basePath}/`);
  console.log('仅提供 out/ 中的文件；不运行 Next.js、CMS、API 或页面回退。');
});
