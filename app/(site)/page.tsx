import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Orbit,
  MousePointer2,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { getCatalog } from '@/lib/catalog';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { StarCompanion } from '@/components/star-companion';

export default async function HomePage() {
  const articles = await getCatalog();
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
            从第一份配置到系统间的协作，
            <br className="desktop-break" />在 Starry手册里找到路径，再动手试一试。
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
          <KnowledgeGraph articles={articles} compact />
          <div className="hero-graph-hint">
            <MousePointer2 size={12} /> 点击星点选择页面 · 沿着关系继续阅读
          </div>
        </div>
      </section>
      <section className="entry-section">
        <div className="section-heading">
          <h2>
            选择你的探索方式<span> / EXPLORE</span>
          </h2>
          <span>阅读只是一个开始</span>
        </div>
        <div className="entry-grid">
          <Link href="/read/architecture" className="entry-card">
            <div className="entry-card-top">
              <span className="entry-icon blue">
                <BookOpen size={20} />
              </span>
              <span>01 / UNDERSTAND</span>
              <ArrowUpRight size={18} />
            </div>
            <h3>从全局，看清架构</h3>
            <p>领域、配置与运行时如何协作。沿着关联页面，逐层理解。</p>
            <span className="card-link">
              阅读架构导览 <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/lab" className="entry-card">
            <div className="entry-card-top">
              <span className="entry-icon lime">
                <MousePointer2 size={20} />
              </span>
              <span>02 / EXPERIMENT</span>
              <ArrowUpRight size={18} />
            </div>
            <h3>动动参数，看看结果</h3>
            <p>把抽象机制放上时间线。改变输入时机，亲手试出边界。</p>
            <span className="card-link">
              打开交互实验 <ArrowRight size={14} />
            </span>
          </Link>
          <Link href="/blueprint" className="entry-card">
            <div className="entry-card-top">
              <span className="entry-icon purple">
                <Workflow size={20} />
              </span>
              <span>03 / INSPECT</span>
              <ArrowUpRight size={18} />
            </div>
            <h3>直接读懂蓝图节点</h3>
            <p>在网页里平移、缩放节点，也可以粘贴自己的 UE 节点文本。</p>
            <span className="card-link">
              查看蓝图示例 <ArrowRight size={14} />
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
            ['architecture', '架构导览'],
            ['input-buffer', '试用一个机制'],
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
