import { collection, config, fields } from '@keystatic/core';
import { block, wrapper } from '@keystatic/core/content-components';

export default config({
  locale: 'zh-CN',
  storage: { kind: 'local' },
  ui: { brand: { name: 'Starry手册' } },
  collections: {
    articles: collection({
      label: '文章',
      columns: ['title', 'description'],
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
              '使用英文小写和短横线；模块文章沿用对应领域的稳定前缀，例如 input-。改名时同步更新链接。',
          },
        }),
        description: fields.text({ label: '简介', multiline: true }),
        section: fields.array(
          fields.text({ label: '子模块或功能分区', validation: { isRequired: true } }),
          {
            label: '所属层级',
            description:
              '按从外到内的顺序填写，例如「行为执行」→「树后端」。模块总览留空；目录自动生成。',
            itemLabel: (props) => props.value || '子模块或功能分区',
          },
        ),
        order: fields.integer({ label: '阅读顺序', defaultValue: 10 }),
        content: fields.mdx({
          label: '正文',
          components: {
            Note: wrapper({ label: '说明卡片', schema: { title: fields.text({ label: '标题' }) } }),
            BlueprintViewer: block({
              label: '蓝图用法说明',
              schema: {
                title: fields.text({ label: '节点图标题' }),
                source: fields.text({
                  label: 'UE 节点文本',
                  description:
                    '从 UE 蓝图编辑器复制完整节点文本，随文章保存，读者打开正文时直接显示。',
                  multiline: true,
                }),
              },
            }),
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
