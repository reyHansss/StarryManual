import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { DocumentSearch } from '@/components/document-search';
import { getCatalog } from '@/lib/catalog';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const articles = await getCatalog();
  return (
    <DocumentSearch articles={articles}>
      <div className="site-shell">
        <a href="#main" className="skip-link">
          跳到正文
        </a>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <span className="footer-wordmark">
            STARRY MANUAL <span>© 2026</span>
          </span>
          <span>
            <i className="status-dot" /> Starry 项目文档 · 各模块架构与功能使用
          </span>
          <Link href="/read/writing">
            文档维护说明 <span>↗</span>
          </Link>
        </footer>
      </div>
    </DocumentSearch>
  );
}
