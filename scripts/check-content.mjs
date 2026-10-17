import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const directory = path.join(process.cwd(), 'content/articles');
const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  section: z.array(z.string().trim().min(1)).default([]),
  order: z.number().int(),
});
const files = (await readdir(directory)).filter((file) => file.endsWith('.mdx'));
const slugs = new Set(files.map((file) => file.slice(0, -4)));
const errors = [];
let linkCount = 0;
for (const file of files) {
  const raw = await readFile(path.join(directory, file), 'utf8');
  const { data, content } = matter(raw);
  const result = schema.safeParse(data);
  if (!result.success) errors.push(`${file}: 元信息无效：${result.error.message}`);
  if (!/^[a-z0-9-]+\.mdx$/.test(file))
    errors.push(`${file}: 文章标识必须使用英文小写、数字或短横线`);
  // 只检查正文链接，避免代码示例中的占位内容被误判。
  const body = content.replace(/```[\s\S]*?```/g, '');
  for (const match of body.matchAll(/\]\(\/read\/([^\s)#]+)(?:#[^)]*)?\)/g)) {
    linkCount++;
    if (!slugs.has(match[1])) errors.push(`${file}: 链接目标不存在：${match[1]}`);
  }
  if (/KnowledgeBase|(?:\.\.\/|\.\.\\)|(?:\]\(|href=["'])[^\n)]*\bDocs\//i.test(body)) {
    errors.push(`${file}: 正文含有超出本站内容目录的引用`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(`通过：${files.length} 篇文章，${linkCount} 个本站链接，元信息完整，无失效引用。`);
