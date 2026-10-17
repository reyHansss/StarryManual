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
          <i className="status-dot" /> STARRY / 你的探索手册
        </span>
        <span>READ. CONNECT. EXPERIMENT.</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="edition-label">
            <Sparkles size={15} /> 今天，也发现一点新东西
          </span>
          <h1>
            读懂系统，
            <br />
            点亮<span>每个灵感。</span>
          </h1>
          <p>
            从 AI 决策、玩家输入到调试观察，
            <br className="desktop-break" />
            沿着真实配置与运行机制，找到动手的路径。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/read/start-here">
              开始阅读 <ArrowRight size={16} />
            </Link>
            <Link href="/graph" className="button quiet">
              探索知识图谱 <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span>✦ 为好奇心而写</span>
            <i />
            让架构可见，让使用直观
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-sticker">
            <StarCompanion />
          </div>
          <div className="visual-heading">
            <span className="eyebrow">
              <Orbit size={17} /> 知识星图 <span>CONNECT THE DOTS</span>
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
            从一个模块开始<span> / EXPLORE</span>
          </h2>
          <span>AstraAI · HaloDebug · Input</span>
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
            <h3>理解 AI 的每次选择</h3>
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
            <h3>看见系统正在发生什么</h3>
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
            <h3>让每次操作准确抵达</h3>
            <p>接好 Action、配置与 Handler，再处理缓存、改键和玩家偏好。</p>
            <span className="card-link">
              进入 Input <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>
      <section className="reading-path">
        <div>
          <span className="eyebrow">YOUR FIRST ROUTE</span>
          <h2>第一次来？沿这条路线出发。</h2>
        </div>
        <div className="path-steps">
          {[
            ['start-here', '认识手册'],
            ['architecture', '理解模块协作'],
            ['halodebug-overview', '打开调试工具'],
          ].map(([slug, label], index) => (
            <Link href={`/read/${slug}`} key={slug}>
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
