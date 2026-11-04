import { collection, config, fields, singleton } from '@keystatic/core';
import { block, wrapper } from '@keystatic/core/content-components';
import { BlueprintSourceInput } from './components/blueprint-source-input';

export default config({
  locale: 'zh-CN',
  storage: { kind: 'local' },
  ui: { brand: { name: 'Starry手册' } },
  singletons: {
    siteLinks: singleton({
      label: '首页推荐站点',
      path: 'content/site-links',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        sites: fields.array(
          fields.object({
            title: fields.text({ label: '站点名称', validation: { isRequired: true } }),
            description: fields.text({ label: '简介', multiline: true }),
            url: fields.url({ label: '网址', validation: { isRequired: true } }),
          }),
          {
            label: '推荐站点',
            description: '按显示顺序添加；首页自动排版，点击后在新标签页打开。',
            itemLabel: (props) => props.fields.title.value || '新站点',
          },
        ),
      },
    }),
  },
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
                source: {
                  ...fields.text({
                    label: 'UE 节点文本',
                    description:
                      '从 UE 蓝图编辑器复制完整节点文本，随文章保存，读者打开正文时直接显示。',
                    multiline: true,
                  }),
                  Input: BlueprintSourceInput,
                },
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
                steps: fields.checkbox({
                  label: '逐步播放',
                  description: '仅对时序图生效：读者可以按消息顺序逐条查看。',
                  defaultValue: false,
                }),
              },
            }),
            Screenshot: block({
              label: '截图',
              schema: {
                src: fields.text({
                  label: '图片路径',
                  description:
                    '放在 public/images/ 下的文件，填写站内路径，例如 /images/stellaai/stack-editor.png。',
                  validation: { isRequired: true },
                }),
                title: fields.text({ label: '图注', validation: { isRequired: true } }),
              },
            }),
            ModifierStackDemo: block({
              label: 'StellaAI 叠加演示',
              schema: {
                title: fields.text({ label: '演示标题' }),
                source: fields.text({
                  label: '场景文本',
                  description:
                    '“层 名称”开始一层，之后每行一个条目：AddGroup／AddBehavior 路径 [Critical|Normal] 模板名，RemoveGroup／RemoveBehavior 路径。路径用 / 分隔组。',
                  multiline: true,
                }),
              },
            }),
            InputBufferDemo: block({
              label: '输入缓存演示',
              schema: {
                title: fields.text({ label: '演示标题' }),
                source: fields.text({
                  label: '场景文本',
                  description:
                    '模式 LastCommand；处理器 名称 缓存 [通道] 或 处理器 名称 不缓存；动作 名称 处理器…；随后按顺序写 打开／输入／关闭／取消／重置。',
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
