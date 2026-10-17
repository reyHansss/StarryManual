import { getCatalog } from '@/lib/catalog';
import { KnowledgeGraph } from '@/components/knowledge-graph';

export const metadata = { title: '知识图谱' };
export default async function GraphPage() {
  return (
    <main id="main" className="wide-page graph-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE KNOWLEDGE MAP</span>
          <h1>顺着联系，发现下一页。</h1>
          <p>从全局看联系，进入局部看细节。每条连线都来自文章里的链接。</p>
        </div>
        <span className="pill">拖动探索 · 节点可进入局部图</span>
      </div>
      <KnowledgeGraph articles={await getCatalog()} />
      <div className="understated-note">
        局部图显示中心文章与直接相连的页面，包含正向和反向链接。主题图按文章分类生成；连线表示阅读关联，方向与系统调用、模块依赖无关。
      </div>
    </main>
  );
}
