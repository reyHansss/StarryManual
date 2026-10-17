import Link from 'next/link';
import { ArrowRight, Workflow } from 'lucide-react';
import { BlueprintViewer } from '@/components/blueprint-viewer';

export const metadata = { title: '蓝图节点预览' };
export default function BlueprintPage() {
  return (
    <main id="main" className="feature-page blueprint-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">AUTHORING PREVIEW</span>
          <h1>蓝图节点预览</h1>
          <p>编写蓝图用法说明前，在这里检查节点文本。正式节点图随文章保存并在正文中展示。</p>
        </div>
        <span className="pill">
          <Workflow size={13} /> UE 节点查看
        </span>
      </div>
      <BlueprintViewer />
      <div className="blueprint-explainer">
        <div>
          <span className="eyebrow">FROM EDITOR TO PAGE</span>
          <h2>复制节点，就能展示。</h2>
          <p>
            在 UE
            蓝图编辑器里选中需要阅读的节点并复制，点击上方「粘贴节点」查看。文本仅保留在当前页面，刷新或清空后移除。
          </p>
        </div>
        <div>
          <p>
            当前画布使用本地 blueprintUE 渲染器。画布用于展示你粘贴的节点，不执行蓝图，也不直接打开
            .uasset。其他图表类型与 UE 5.8 的复杂节点还需逐类验证。
          </p>
          <Link href="/read/blueprint-nodes">
            在文章中嵌入节点图 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
