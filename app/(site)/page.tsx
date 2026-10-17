import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Orbit, MousePointer2, BookOpen, Sparkles } from 'lucide-react';
import { getCatalog } from '@/lib/catalog';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { StarCompanion } from '@/components/star-companion';
import siteLinks from '@/content/site-links.json';

export default async function HomePage() {
  const articles = await getCatalog();
  const previewSlugs = new Set([
    'start-here',
    'architecture',
    'astraai-overview',
    'halodebug-overview',
    'input-overview',
    'writing',
  ]);
  return (
    <main id="main" className="home-main">
      <div className="home-kicker">
        <span>
          <i className="status-dot" /> STARRY / 项目文档
        </span>
        <span>STARRY MANUAL</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="edition-label">
            <Sparkles size={15} /> UNREAL ENGINE 5.8
          </span>
          <h1>
            Starry
            <br />
            <span>项目文档</span>
          </h1>
          <p>
            按模块与具体功能查阅 Starry。
            <br className="desktop-break" />
            了解功能用法、技术架构与扩展方法。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/read/start-here">
              开始阅读 <ArrowRight size={16} />
            </Link>
            <Link href="/graph" className="button quiet">
              知识图谱 <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span>✦ 模块与功能说明</span>
            <i />
            随项目开发持续维护
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-sticker">
            <StarCompanion />
          </div>
          <div className="visual-heading">
            <span className="eyebrow">
              <Orbit size={17} /> 文档关系 <span>DOCUMENT MAP</span>
            </span>
            <span className="visual-coordinate">✦ LIVE MAP</span>
          </div>
          <KnowledgeGraph
            articles={articles.filter((article) => previewSlugs.has(article.slug))}
            compact
          />
          <div className="hero-graph-hint">
            <MousePointer2 size={12} /> 点击星点选择页面 · 沿着关系继续阅读
          </div>
        </div>
      </section>
      {siteLinks.sites.length > 0 && (
        <section className="site-recommendations" aria-labelledby="site-recommendations-title">
          <div className="site-recommendations-intro">
            <span className="eyebrow">BOOKMARKS</span>
            <h2 id="site-recommendations-title">推荐站点</h2>
            <p>值得收藏的 Unreal Engine 技术资料。</p>
          </div>
          <div className="site-recommendations-list">
            {siteLinks.sites.map((site) => (
              <a
                className="recommended-site"
                href={site.url}
                key={site.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${site.title}（在新标签页打开）`}
              >
                <span className="recommended-site-icon">
                  <BookOpen size={24} aria-hidden="true" />
                </span>
                <span className="recommended-site-copy">
                  <strong>{site.title}</strong>
                  <span>{site.description}</span>
                  <small>{site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</small>
                </span>
                <ArrowUpRight size={20} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
