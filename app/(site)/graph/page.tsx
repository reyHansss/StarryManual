import { getCatalog } from '@/lib/catalog';
import { KnowledgeGraph } from '@/components/knowledge-graph';

export const metadata = { title: '知识图谱' };
export default async function GraphPage() {
  return (
    <main id="main" className="wide-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE KNOWLEDGE MAP</span>
          <h1>顺着联系，发现下一页。</h1>
          <p>每个节点是一篇文章，每条连线来自文章里的链接。</p>
        </div>
        <span className="pill">单击选择 · 箭头打开文章</span>
      </div>
      <KnowledgeGraph articles={await getCatalog()} />
      <div className="understated-note">
        连线表示阅读关联，方向与系统调用、模块依赖无关。也可以从每篇文章右侧查看前往和引用它的页面。
      </div>
    </main>
  );
}
