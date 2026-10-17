import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Orbit,
  MousePointer2,
  BrainCircuit,
  Bug,
  Gamepad2,
  Sparkles,
} from 'lucide-react';
import { getCatalog } from '@/lib/catalog';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { StarCompanion } from '@/components/star-companion';

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
        <span>ARCHITECTURE · SYSTEMS · TOOLS</span>
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
            Starry 的技术架构、玩法系统与开发工具。
            <br className="desktop-break" />
            查阅功能配置、使用说明和扩展方法。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/read/start-here">
              开始阅读 <ArrowRight size={16} />
            </Link>
            <Link href="/read/architecture" className="button quiet">
              项目架构 <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span>✦ 项目总览与功能使用</span>
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
      <section className="entry-section">
        <div className="section-heading">
          <h2>
            近期整理的章节<span> / CHAPTERS</span>
          </h2>
          <span>按项目系统持续补充</span>
        </div>
        <div className="entry-grid">
          <Link href="/read/astraai-overview" className="entry-card">
            <div className="entry-card-top">
              <span className="entry-icon">
                <BrainCircuit size={20} />
              </span>
              <span>01 / ASTRA AI</span>
              <ArrowUpRight size={18} />
            </div>
            <h3>AstraAI · AI 决策</h3>
            <p>从行为组合到机会、评分与执行，配置可扩展的 NPC 决策。</p>
            <span className="card-link">
              进入 AstraAI <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/read/halodebug-overview" className="entry-card">
            <div className="entry-card-top">
              <span className="entry-icon">
                <Bug size={20} />
              </span>
              <span>02 / HALO DEBUG</span>
              <ArrowUpRight size={18} />
            </div>
            <h3>HaloDebug · 调试工具</h3>
            <p>打开场景、日志、AI 与输入工具，沿真实状态定位问题。</p>
            <span className="card-link">
              进入 HaloDebug <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/read/input-overview" className="entry-card">
            <div className="entry-card-top">
              <span className="entry-icon">
                <Gamepad2 size={20} />
              </span>
              <span>03 / PLAYER INPUT</span>
              <ArrowUpRight size={18} />
            </div>
            <h3>Input · 玩家输入</h3>
            <p>接好 Action、配置与 Handler，再处理缓存、改键和玩家偏好。</p>
            <span className="card-link">
              进入 Input <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>
      <section className="reading-path">
        <div>
          <span className="eyebrow">PROJECT DOCUMENTATION</span>
          <h2>按需要查阅项目文档</h2>
        </div>
        <div className="path-steps">
          {[
            ['/read/start-here', '项目总览'],
            ['/read/architecture', '技术架构'],
            ['/graph', '知识图谱'],
          ].map(([href, label], index) => (
            <Link href={href} key={href}>
              <span>0{index + 1}</span>
              {label}
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
