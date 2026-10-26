import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  articleModules,
  getArticleLabel,
  getSectionAnchor,
  type ModuleNavigation,
  type NavigationEntry,
} from '@/lib/navigation';

function ContentsEntries({ entries }: { entries: NavigationEntry[] }) {
  return (
    <ul className="module-function-list">
      {entries.map((entry) => (
        <li key={entry.kind === 'article' ? entry.article.slug : entry.label}>
          {entry.kind === 'article' ? (
            <>
              <Link href={entry.article.url}>
                <span>{getArticleLabel(entry.article)}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <p>{entry.article.description}</p>
            </>
          ) : (
            <>
              <strong id={getSectionAnchor(entry.path)}>{entry.label}</strong>
              <ContentsEntries entries={entry.entries} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ModuleContents({ module }: { module: ModuleNavigation }) {
  const entries = module.entries.filter(
    (entry) => entry.kind !== 'article' || entry.article.slug !== module.overview?.slug,
  );
  if (!entries.length) return null;
  return (
    <section
      className="module-contents"
      aria-labelledby="module-contents"
      style={
        {
          '--module-color': articleModules[module.key].nodeColor,
          '--module-ink': articleModules[module.key].color,
        } as React.CSSProperties
      }
    >
      <h2 id="module-contents">子模块与功能</h2>
      <p>进入具体功能，查阅使用步骤、运行机制与扩展方法。</p>
      <div className="module-contents-grid">
        {entries.map((entry) => (
          <div
            className="module-function-card"
            key={entry.kind === 'article' ? entry.article.slug : entry.label}
          >
            {entry.kind === 'section' ? (
              <>
                <h3 id={getSectionAnchor(entry.path)}>{entry.label}</h3>
                <ContentsEntries entries={entry.entries} />
              </>
            ) : (
              <ContentsEntries entries={[entry]} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
