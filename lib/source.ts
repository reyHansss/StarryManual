import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

const articles = defineDocs({
  dir: 'content/articles',
  docs: {
    schema: pageSchema.extend({
      category: z.enum(['guide', 'architecture', 'reference']).default('guide'),
      section: z.array(z.string().trim().min(1)).default([]),
      order: z.number().default(10),
    }),
  },
});

export const source = loader({ baseUrl: '/read', source: articles.toFumadocsSource() });
