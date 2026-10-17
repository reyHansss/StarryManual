import ArticlePage from './[slug]/page';

export const metadata = { title: '文档首页' };

export default function Page() {
  return <ArticlePage params={Promise.resolve({ slug: 'start-here' })} />;
}
