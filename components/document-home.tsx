import Link from 'next/link';
import { ArrowUpRight, Network, Sparkles } from 'lucide-react';
import { SearchTrigger } from '@/components/document-search';
import { EditorLink } from '@/components/editor-link';
import { StarCompanion } from '@/components/star-companion';

/** 阅读入口与原导览地址共用同一份文章，独立项目首页保留原有版式。 */
export function DocumentHome({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="document-home" aria-labelledby="document-home-title">
      <div className="home-welcome">
        <div className="home-intro">
          <span className="eyebrow">
            <Sparkles size={15} /> STARRY / PROJECT MANUAL
          </span>
          <h1 id="document-home-title">{title}</h1>
          <p>{description}</p>
          <SearchTrigger prominent />
          <div className="home-shortcuts">
            <Link href="/graph">
              <Network size={15} /> 探索知识图谱 <ArrowUpRight size={13} />
            </Link>
            <EditorLink slug="start-here" />
          </div>
        </div>
        <div className="home-companion" aria-hidden="true">
          <div className="home-companion-art">
            <StarCompanion />
          </div>
          <span>✦ UNREAL ENGINE 5.8</span>
        </div>
      </div>
      <div className="prose article-prose document-home-copy">{children}</div>
    </section>
  );
}
