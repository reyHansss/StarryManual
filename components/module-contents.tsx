import Link from 'next/link';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import {
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
                <ArrowUpRight size={13} aria-hidden="true" />
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
    <section className="module-contents" aria-labelledby="module-contents">
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

export function ModuleDirectory({ modules }: { modules: ModuleNavigation[] }) {
  return (
    <section className="module-contents" aria-labelledby="module-directory">
      <h2 id="module-directory">按模块查阅</h2>
      <p>选择模块，再进入对应的子模块和功能。其他模块随内容整理继续补充。</p>
      <div className="module-contents-grid">
        {modules
          .filter((module) => module.overview)
          .map((module) => (
            <Link className="module-directory-card" href={module.overview!.url} key={module.key}>
              <span>
                <Layers3 size={16} aria-hidden="true" />
                {module.label}
                <ArrowUpRight size={15} aria-hidden="true" />
              </span>
              <p>{module.overview!.description}</p>
              <small>
                {module.entries
                  .filter((entry) => entry.kind === 'section')
                  .map((entry) => entry.label)
                  .join(' · ')}
              </small>
            </Link>
          ))}
      </div>
    </section>
  );
}
