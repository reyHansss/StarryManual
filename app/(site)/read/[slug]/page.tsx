import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, ListTree, Network } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { source } from '@/lib/source';
import { getCatalog } from '@/lib/catalog';
import {
  articleModules,
  buildModuleNavigation,
  getArticleLabel,
  getReadingNeighbors,
  getSectionAnchor,
  type ModuleKey,
} from '@/lib/navigation';
import type { Article } from '@/lib/types';
import { ReadingNavigation } from '@/components/reading-navigation';
import { ModuleContents } from '@/components/module-contents';
import { ArticleToc } from '@/components/article-toc';
import { getMDXComponents } from '@/components/mdx';
import { EditorLink } from '@/components/editor-link';

type Props = { params: Promise<{ slug: string }> };

// 关联列表先显示前几篇，其余收进可展开区域，避免枢纽文章把右栏拉得过长。
const RELATION_PREVIEW = 6;

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: page.slugs[0] }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage([slug]);
  return { title: page?.data.title ?? '未找到页面' };
}

function RelationLinks({ articles, from }: { articles: Article[]; from: ModuleKey }) {
  return articles.map((article) => (
    <Link href={article.url} key={article.slug}>
      <i style={{ background: articleModules[article.module].nodeColor }} aria-hidden="true" />
      <span>{getArticleLabel(article)}</span>
      {article.module !== from && <small>{articleModules[article.module].shortLabel}</small>}
    </Link>
  ));
}

function RelationGroup({
  title,
  articles,
  empty,
  from,
}: {
  title: string;
  articles: Article[];
  empty: string;
  from: ModuleKey;
}) {
  const rest = articles.slice(RELATION_PREVIEW);
  return (
    <div className="relation-group">
      <h3>
        {title} <span>{articles.length}</span>
      </h3>
      {articles.length ? (
        <div className="relation-list">
          <RelationLinks articles={articles.slice(0, RELATION_PREVIEW)} from={from} />
          {rest.length > 0 && (
            <details className="relation-more">
              <summary>
                其余 {rest.length} 篇 <ChevronDown size={13} aria-hidden="true" />
              </summary>
              <RelationLinks articles={rest} from={from} />
            </details>
          )}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const page = source.getPage([slug]);
  if (!page) notFound();
  const articles = await getCatalog();
  const current = articles.find((article) => article.slug === slug);
  if (!current) notFound();
  const MDX = page.data.body;
  const modules = buildModuleNavigation(articles);
  const module = modules.find((group) => group.key === current.module)!;
  const moduleInfo = articleModules[module.key];
  const isModuleOverview =
    module.overview?.slug === slug && !['manual', 'authoring'].includes(module.key);
  const outgoing = articles.filter((article) => current.links.includes(article.slug));
  const incoming = articles.filter(
    (article) => article.slug !== slug && article.links.includes(slug),
  );
  const { previous, next } = getReadingNeighbors(module, slug);
  const toc: TOCItemType[] = isModuleOverview
    ? [{ title: '子模块与功能', url: '#module-contents', depth: 2 }, ...page.data.toc]
    : page.data.toc;
  return (
    <main id="main" className="reading-layout">
      <ReadingNavigation modules={modules} current={current} />
      <article className="reading-article">
        <header className="article-header">
          <nav className="article-breadcrumb" aria-label="阅读位置">
            <Link href="/read/start-here">手册</Link>
            <span>/</span>
            {module.overview && module.overview.slug !== slug ? (
              <Link href={module.overview.url}>{module.label}</Link>
            ) : (
              <span className="breadcrumb-label">{module.label}</span>
            )}
            {(current.section ?? []).map((label, index, path) => (
              <span className="breadcrumb-level" key={index}>
                <span>/</span>
                {module.overview ? (
                  <Link
                    href={`${module.overview.url}#${encodeURIComponent(getSectionAnchor(path.slice(0, index + 1)))}`}
                  >
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </span>
            ))}
            <span>/</span>
            <strong aria-current="page">{getArticleLabel(current)}</strong>
          </nav>
          <h1>{page.data.title}</h1>
          <p className="article-description">{page.data.description}</p>
          <div className="article-meta">
            <span
              className="module-chip"
              style={
                {
                  '--module-color': moduleInfo.nodeColor,
                  '--module-ink': moduleInfo.color,
                } as React.CSSProperties
              }
            >
              <i aria-hidden="true" />
              {module.label}
            </span>
            <EditorLink slug={slug} />
          </div>
        </header>
        {toc.length > 0 && (
          <details className="inline-toc">
            <summary>
              <ListTree size={16} aria-hidden="true" />
              本页内容
              <small>{toc.length} 节</small>
              <ChevronDown size={15} aria-hidden="true" />
            </summary>
            <nav aria-label="本页内容">
              {toc.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  style={{ paddingLeft: 14 + Math.max(0, item.depth - 2) * 14 }}
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </details>
        )}
        {isModuleOverview && <ModuleContents module={module} />}
        <div className="prose article-prose">
          <MDX components={getMDXComponents()} />
        </div>
        {(previous || next) && (
          <nav className="article-next" aria-label="模块内阅读顺序">
            {previous ? (
              <Link href={previous.url} rel="prev">
                <span>
                  <ArrowLeft size={14} aria-hidden="true" />
                  上一篇
                </span>
                <strong>{getArticleLabel(previous)}</strong>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.url} rel="next">
                <span>
                  下一篇
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
                <strong>{getArticleLabel(next)}</strong>
              </Link>
            )}
          </nav>
        )}
      </article>
      <aside className="reading-context" aria-label="本页目录与关联阅读">
        <ArticleToc items={toc} />
        <section className="context-relations" aria-labelledby="relations-title">
          <h2 id="relations-title">关联阅读</h2>
          <RelationGroup
            title="从这里出发"
            articles={outgoing}
            empty="本页没有链接其他文章。"
            from={module.key}
          />
          <RelationGroup
            title="链接到本页"
            articles={incoming}
            empty="暂无其他文章链接到这里。"
            from={module.key}
          />
          <Link href={`/graph?module=${module.key}&center=${slug}`} className="open-local-graph">
            <Network size={15} aria-hidden="true" />
            本页关系图谱
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </section>
      </aside>
    </main>
  );
}
