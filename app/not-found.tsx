import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 / OFF THE MAP</span>
      <h1>这片区域还没有页面。</h1>
      <p>可以从首页重新出发，或者打开关系图谱寻找关联文章。</p>
      <Link href="/" className="button primary">
        回到首页 →
      </Link>
    </main>
  );
}
