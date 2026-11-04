import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { countTermPlacements } from '../lib/terms.ts';

const directory = path.join(process.cwd(), 'content/articles');
const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  section: z.array(z.string().trim().min(1)).default([]),
  order: z.number().int(),
  terms: z
    .array(
      z.object({
        term: z.string().trim().min(1),
        aliases: z.array(z.string().trim().min(1)).default([]),
        brief: z.string().trim().min(1),
      }),
    )
    .default([]),
});
// 每个术语只在一篇文章中定义；术语页和搜索从定义处汇总。
const termOwners = new Map();
const files = (await readdir(directory)).filter((file) => file.endsWith('.mdx'));
const slugs = new Set(files.map((file) => file.slice(0, -4)));
const errors = [];
let linkCount = 0;
for (const file of files) {
  const raw = await readFile(path.join(directory, file), 'utf8');
  const { data, content } = matter(raw);
  const result = schema.safeParse(data);
  if (!result.success) errors.push(`${file}: 元信息无效：${result.error.message}`);
  for (const { term } of result.success ? result.data.terms : []) {
    const key = term.toLowerCase();
    if (termOwners.has(key))
      errors.push(`${file}: 术语“${term}”已在 ${termOwners.get(key)} 中定义`);
    else termOwners.set(key, file);
  }
  if (!/^[a-z0-9-]+\.mdx$/.test(file))
    errors.push(`${file}: 文章标识必须使用英文小写、数字或短横线`);
  // 只检查正文链接，避免代码示例中的占位内容被误判。
  const body = content.replace(/```[\s\S]*?```/g, '');
  // <Terms /> 指定术语列表在正文中的位置，只能放一次，且要有登记的术语可列。
  const termPlacements = countTermPlacements(content);
  if (termPlacements > 1) errors.push(`${file}: <Terms /> 只能放置一次`);
  if (termPlacements && !(result.success && result.data.terms.length))
    errors.push(`${file}: 正文放置了 <Terms />，但元信息没有登记术语`);
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
  console.log(
    `通过：${files.length} 篇文章，${linkCount} 个本站链接，${termOwners.size} 个术语，元信息完整，无失效引用。`,
  );
