import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Sparkles } from 'lucide-react';
import { ParticlePortrait } from '@/components/particle-effects';
import siteLinks from '@/content/site-links.json';

export default function HomePage() {
  return (
    <main id="main" className="home-main">
      <section className="hero">
        <div className="hero-copy">
          <span className="edition-label">
            <Sparkles size={15} /> UNREAL ENGINE 5.8
          </span>
          <h1>
            <span className="hero-name">Starry</span>
            <span className="hero-title">项目文档</span>
          </h1>
          <p className="hero-summary">
            按模块与具体功能查阅 Starry。
            <br className="desktop-break" />
            了解<em>功能用法</em>、<em>技术架构</em>与<em>扩展方法</em>。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/read/start-here">
              开始阅读 <ArrowRight size={16} />
            </Link>
            <Link href="/graph" className="button quiet">
              关系图谱 <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <ParticlePortrait />
        </div>
      </section>
      {siteLinks.sites.length > 0 && (
        <section className="site-recommendations" aria-labelledby="site-recommendations-title">
          <div className="site-recommendations-intro">
            <h2 id="site-recommendations-title">推荐站点</h2>
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
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <span className="recommended-site-copy">
                  <strong>{site.title}</strong>
                  <span>{site.description}</span>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
