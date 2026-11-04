import { getCatalog } from '@/lib/catalog';
import { collectTerms } from '@/lib/terms';
import { TermIndex } from '@/components/term-index';

export const metadata = { title: '术语' };

/** 术语页由各文章元信息中登记的术语自动生成，不维护第二份清单。 */
export default async function TermsPage() {
  const entries = collectTerms(await getCatalog());
  return (
    <main id="main" className="wide-page">
      <div className="page-heading">
        <div>
          <h1>术语</h1>
          <p>各模块文章中定义的概念汇总在这里，按模块分组；点击“定义见”回到原文。</p>
        </div>
      </div>
      <TermIndex entries={entries} />
    </main>
  );
}
