import Link from 'next/link';
import { getTermAnchor } from '@/lib/terms';
import type { Term } from '@/lib/types';
import styles from './terms.module.css';

/** 术语定义列表；每条带锚点，术语页与搜索结果可以直接定位到这里。 */
function TermList({ terms }: { terms: Term[] }) {
  return (
    <dl className={styles.list}>
      {terms.map((entry) => (
        <div className={styles.item} id={getTermAnchor(entry.term)} key={entry.term}>
          <dt>
            {entry.term}
            {entry.aliases.length > 0 && (
              <span className={styles.aliases}>{entry.aliases.join(' · ')}</span>
            )}
          </dt>
          <dd>{entry.brief}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 正文中 `<Terms />` 所在位置的术语列表，供需要先介绍概念再展开的文章使用。 */
export function InlineTerms({ terms }: { terms: Term[] }) {
  return (
    <div className={styles.inline}>
      <TermList terms={terms} />
      <Link className={styles.more} href="/terms">
        查看全部术语
      </Link>
    </div>
  );
}

/** 文章末尾的“本页术语”；正文已放置 `<Terms />` 时由页面省略。 */
export function ArticleTerms({ terms }: { terms: Term[] }) {
  return (
    <section className={styles.block} aria-labelledby="本页术语">
      <h2 id="本页术语">本页术语</h2>
      <TermList terms={terms} />
      <Link className={styles.more} href="/terms">
        查看全部术语
      </Link>
    </section>
  );
}
