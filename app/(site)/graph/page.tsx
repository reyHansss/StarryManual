import { getCatalog } from '@/lib/catalog';
import { KnowledgeGraph } from '@/components/knowledge-graph';

export const metadata = { title: '关系图谱' };
export default async function GraphPage() {
  return (
    <main id="main" className="wide-page graph-page">
      <div className="page-heading">
        <div>
          <h1>关系图谱</h1>
          <p>按模块与功能查找内容，再沿文章之间的真实链接继续探索。</p>
        </div>
      </div>
      <KnowledgeGraph articles={await getCatalog()} />
      <div className="understated-note">
        全局图可切换主模块与全部文章，模块连线汇总跨模块阅读链接。模块图可继续按功能分区筛选，文章局部图保留正向和反向链接；连线表示阅读关联，程序调用与模块依赖由正文图表说明。
      </div>
    </main>
  );
}
