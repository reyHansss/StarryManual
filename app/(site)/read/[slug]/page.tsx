import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Network, Link2 } from 'lucide-react';
import { source } from '@/lib/source';
import { getCatalog } from '@/lib/catalog';
import {
  buildModuleNavigation,
  getArticleLabel,
  getReadingNeighbors,
  getSectionAnchor,
} from '@/lib/navigation';
import { ReadingNavigation } from '@/components/reading-navigation';
import { ModuleContents } from '@/components/module-contents';
import { DocumentHome } from '@/components/document-home';
import { getMDXComponents } from '@/components/mdx';
import { EditorLink } from '@/components/editor-link';

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
  const modules = buildModuleNavigation(articles);
  const module = modules.find((group) => group.key === current.module)!;
  const isModuleOverview =
    module.overview?.slug === slug && !['manual', 'authoring'].includes(module.key);
  if (slug === 'start-here') {
    return (
      <main id="main" className="reading-layout document-home-layout">
        <ReadingNavigation modules={modules} current={current} />
        <DocumentHome title={page.data.title} description={page.data.description ?? ''}>
          <MDX components={getMDXComponents()} />
        </DocumentHome>
      </main>
    );
  }
  const outgoing = articles.filter((article) => current.links.includes(article.slug));
  const incoming = articles.filter(
    (article) => article.slug !== slug && article.links.includes(slug),
  );
  const { previous, next } = getReadingNeighbors(module, slug);
  return (
    <main id="main" className="reading-layout">
      <ReadingNavigation modules={modules} current={current} />
      <article className="reading-article">
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
        <div className="article-eyebrow">
          <span className="pill">{module.label}</span>
        </div>
        <h1>{page.data.title}</h1>
        <p className="article-description">{page.data.description}</p>
        <div className="article-meta">
          <span>STARRY / MANUAL</span>
          <EditorLink slug={slug} />
        </div>
        {isModuleOverview && <ModuleContents module={module} />}
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
          {isModuleOverview && <a href="#module-contents">子模块与功能</a>}
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
