import Link from 'next/link';
import { ArrowRight, Workflow } from 'lucide-react';
import { BlueprintDemo } from '@/components/blueprint-demo';

export const metadata = { title: '蓝图节点' };
export default function BlueprintPage() {
  return (
    <main id="main" className="feature-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BLUEPRINT, IN THE BROWSER</span>
          <h1>熟悉的节点，新的阅读方式。</h1>
          <p>把蓝图放进说明里。放大连线，查看参数，沿着执行路径理解。</p>
        </div>
        <span className="pill">
          <Workflow size={13} /> UE 节点查看
        </span>
      </div>
      <BlueprintDemo />
      <div className="blueprint-explainer">
        <div>
          <span className="eyebrow">FROM EDITOR TO PAGE</span>
          <h2>复制节点，就能展示。</h2>
          <p>
            在 UE
            蓝图编辑器里选中节点并复制，点击上方「粘贴节点」即可尝试。也可以把节点文本作为独立文件随文档维护，再嵌入文章。
          </p>
        </div>
        <div>
          <p>
            当前画布使用本地 blueprintUE
            渲染器。内置内容是手写的教学样例；画布用于展示节点，不执行蓝图，也不直接打开
            .uasset。其他图表类型与 UE 5.8 的复杂节点还需逐类验证。
          </p>
          <Link href="/read/blueprint-nodes">
            阅读节点展示指南 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
