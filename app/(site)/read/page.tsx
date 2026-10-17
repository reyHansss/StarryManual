import ArticlePage from './[slug]/page';

export const metadata = { title: 'Starry手册导览' };

export default function Page() {
  return <ArticlePage params={Promise.resolve({ slug: 'start-here' })} />;
}
