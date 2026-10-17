import type { ModuleKey } from './navigation';

export type Article = {
  slug: string;
  title: string;
  description: string;
  module: ModuleKey;
  section?: string[];
  order: number;
  url: string;
  links: string[];
  text: string;
};
