import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { getCatalog } from '@/lib/catalog';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const articles = await getCatalog();
  return (
    <div className="site-shell">
      <a href="#main" className="skip-link">
        跳到正文
      </a>
      <SiteHeader articles={articles} />
      {children}
      <footer className="site-footer">
        <span className="footer-wordmark">
          STARRY MANUAL <span>© 2026</span>
        </span>
        <span>
          <i className="status-dot" /> 文档体验原型 · 独立示例内容
        </span>
        <Link href="/read/writing">
          如何维护这座知识地图 <span>↗</span>
        </Link>
      </footer>
    </div>
  );
}
