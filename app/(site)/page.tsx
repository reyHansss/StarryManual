import ArticlePage from './read/[slug]/page';

export default function HomePage() {
  return <ArticlePage params={Promise.resolve({ slug: 'start-here' })} />;
}
