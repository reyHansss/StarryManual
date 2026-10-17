import { collection, config, fields } from '@keystatic/core';
import { block, wrapper } from '@keystatic/core/content-components';

export default config({
  locale: 'zh-CN',
  storage: { kind: 'local' },
  ui: { brand: { name: 'Starry手册' } },
  collections: {
    articles: collection({
      label: '文章',
      columns: ['title', 'category'],
      previewUrl: '/read/{slug}',
      slugField: 'title',
      path: 'content/articles/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: { label: '标题' },
          slug: {
            label: '网址标识',
            description:
              '使用英文小写和短横线；模块文章以 astraai-、halodebug- 或 input- 开头。改名时同步更新链接。',
          },
        }),
        description: fields.text({ label: '简介', multiline: true }),
        category: fields.select({
          label: '主题',
          options: [
            { label: '使用指南', value: 'guide' },
            { label: '技术架构', value: 'architecture' },
            { label: '节点与参考', value: 'reference' },
          ],
          defaultValue: 'guide',
        }),
        order: fields.integer({ label: '阅读顺序', defaultValue: 10 }),
        content: fields.mdx({
          label: '正文',
          components: {
            Note: wrapper({ label: '说明卡片', schema: { title: fields.text({ label: '标题' }) } }),
            BlueprintViewer: block({ label: '蓝图节点查看器', schema: {} }),
            Diagram: block({
              label: '自动排版图表',
              schema: {
                title: fields.text({ label: '图表标题' }),
                source: fields.text({
                  label: 'Mermaid 图表文本',
                  description: '填写节点关系、步骤、时序或状态；布局与配色由手册统一处理。',
                  multiline: true,
                }),
              },
            }),
          },
        }),
      },
    }),
  },
});
