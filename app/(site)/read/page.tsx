import ArticlePage from './[slug]/page';

export const metadata = { title: '从这里开始' };

export default function Page() {
  return <ArticlePage params={Promise.resolve({ slug: 'start-here' })} />;
}
