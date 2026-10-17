import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Network, Pencil, Link2 } from 'lucide-react';
import { source } from '@/lib/source';
import { getCatalog } from '@/lib/catalog';
import { articleSections, categories, getArticleSection } from '@/lib/types';
import { getMDXComponents } from '@/components/mdx';
import { isStaticExport } from '@/lib/site-config';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: page.slugs[0] }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage([slug]);
  return { title: page?.data.title ?? '未找到页面' };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage([slug]);
  if (!page) notFound();
  const articles = await getCatalog();
  const current = articles.find((article) => article.slug === slug);
  if (!current) notFound();
  const MDX = page.data.body;
  const section = articleSections[getArticleSection(slug)];
  const navigationGroups = Object.entries(articleSections)
    .map(([key, group]) => ({
      ...group,
      key,
      articles: articles.filter((article) => getArticleSection(article.slug) === key),
    }))
    .filter((group) => group.articles.length > 0);
  const outgoing = articles.filter((article) => current.links.includes(article.slug));
  const incoming = articles.filter(
    (article) => article.slug !== slug && article.links.includes(slug),
  );
  const currentIndex = articles.findIndex((article) => article.slug === slug);
  const previous = articles[currentIndex - 1];
  const next = articles[currentIndex + 1];
  return (
    <main id="main" className="reading-layout">
      <aside className="reading-sidebar">
        <Link href="/" className="sidebar-home">
          <ArrowLeft size={14} />
          回到首页
        </Link>
        <span className="sidebar-label">STARRY PROJECT</span>
        {navigationGroups.map((group) => (
          <div className="sidebar-group" key={group.key}>
            <h2>
              <i style={{ background: group.color }} />
              {group.label}
            </h2>
            {group.articles.map((article) => (
              <Link
                key={article.slug}
                href={article.url}
                className={slug === article.slug ? 'selected' : ''}
              >
                {article.title.replace(/^(AstraAI|HaloDebug|Input) · /, '')}
                {slug === article.slug && <span>↗</span>}
              </Link>
            ))}
          </div>
        ))}
        <Link href="/graph" className="sidebar-graph">
          <Network size={16} />
          <span>在图谱里探索</span>
          <ArrowUpRight size={14} />
        </Link>
      </aside>
      <article className="reading-article">
        <div className="article-breadcrumb">
          手册 <span>/</span> {section.label} <span>/</span> <strong>{current.title}</strong>
        </div>
        <div className="article-eyebrow">
          <span className="eyebrow">{categories[current.category].english}</span>
          <span className="pill">{section.label}</span>
        </div>
        <h1>{page.data.title}</h1>
        <p className="article-description">{page.data.description}</p>
        <div className="article-meta">
          <span>STARRY / MANUAL</span>
          {!isStaticExport && (
            <a href={`/keystatic/collection/articles/item/${slug}`}>
              <Pencil size={13} />
              编辑本页 <ArrowUpRight size={12} />
            </a>
          )}
        </div>
        <div className="prose article-prose">
          <MDX components={getMDXComponents()} />
        </div>
        <div className="article-next">
          {previous ? (
            <Link href={previous.url}>
              <span>
                <ArrowLeft size={13} />
                上一篇
              </span>
              <strong>{previous.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={next.url}>
              <span>
                继续阅读
                <ArrowRight size={13} />
              </span>
              <strong>{next.title}</strong>
            </Link>
          )}
        </div>
      </article>
      <aside className="reading-context">
        <div className="toc-block">
          <h2>本页内容</h2>
          {page.data.toc.map((item) => (
            <a
              key={item.url}
              href={item.url}
              style={{ paddingLeft: Math.max(0, item.depth - 2) * 12 }}
            >
              {item.title}
            </a>
          ))}
        </div>
        <div className="context-relations">
          <h2>
            <Link2 size={13} />
            从这里出发 <span>{outgoing.length}</span>
          </h2>
          {outgoing.map((article) => (
            <Link href={article.url} key={article.slug}>
              {article.title}
              <ArrowUpRight size={12} />
            </Link>
          ))}
          <h2>
            链接到本页 <span>{incoming.length}</span>
          </h2>
          {incoming.length ? (
            incoming.map((article) => (
              <Link href={article.url} key={article.slug}>
                {article.title}
                <ArrowUpRight size={12} />
              </Link>
            ))
          ) : (
            <p>暂无其他文章链接到这里。</p>
          )}
          <Link href="/graph" className="open-full-map">
            <Network size={13} />
            打开完整图谱
          </Link>
        </div>
      </aside>
    </main>
  );
}
