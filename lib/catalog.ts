import 'server-only';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Article } from './types';
import { getArticleModule } from './navigation';

// 关系只从本站文章的真实链接提取，正文和图谱共用一个内容来源。
export async function getCatalog(): Promise<Article[]> {
  const directory = path.join(process.cwd(), 'content/articles');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.mdx'));
  const articles = await Promise.all(
    files.map(async (file) => {
      const { data, content } = matter(await readFile(path.join(directory, file), 'utf8'));
      const slug = file.slice(0, -4);
      return {
        slug,
        title: String(data.title),
        description: String(data.description ?? ''),
        module: getArticleModule(slug),
        section: data.section ?? [],
        order: Number(data.order ?? 10),
        url: `/read/${slug}`,
        links: [
          ...new Set(
            [...content.matchAll(/\]\(\/read\/([a-z0-9-]+)(?:#[^)]*)?\)/g)].map(
              (match) => match[1],
            ),
          ),
        ],
        text: content.replace(/<[^>]*>/g, '').replace(/[#*`\[\]]/g, ''),
      } satisfies Article;
    }),
  );
  return articles.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}
