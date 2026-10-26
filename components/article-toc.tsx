'use client';

import { ArrowUp } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import { TOCItem, TOCItems } from 'fumadocs-ui/components/toc/default';

/** 右栏目录复用 Fumadocs 的标题观察与指示轨道，随阅读位置标出当前小节。 */
export function ArticleToc({ items }: { items: TOCItemType[] }) {
  if (!items.length) return null;
  return (
    <TOCProvider toc={items} single>
      <nav className="toc-block" aria-labelledby="article-toc-title">
        <div className="toc-heading">
          <h2 id="article-toc-title">本页内容</h2>
          <button
            type="button"
            className="toc-top"
            onClick={() => window.scrollTo({ top: 0 })}
            aria-label="回到顶部"
            title="回到顶部"
          >
            <ArrowUp size={14} aria-hidden="true" />
          </button>
        </div>
        <TOCScrollArea className="toc-scroll">
          <TOCItems>
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </TOCItems>
        </TOCScrollArea>
      </nav>
    </TOCProvider>
  );
}
