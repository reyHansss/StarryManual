import Link from 'next/link';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { InputBufferDemo } from '@/components/input-buffer-demo';

export const metadata = { title: '交互实验' };
export default function LabPage() {
  return (
    <main id="main" className="feature-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE INTERACTIVE LAB</span>
          <h1>把机制，变成手感。</h1>
          <p>改变参数，播放过程，让一段说明变成可以观察的结果。</p>
        </div>
        <span className="pill">
          <SlidersHorizontal size={13} /> 实验 01
        </span>
      </div>
      <div className="feature-grid">
        <div>
          <InputBufferDemo />
          <div className="understated-note">
            本实验在浏览器中模拟一个输入缓冲规则，用于讲解等待与过期；未连接 UE 运行时。
          </div>
        </div>
        <aside className="feature-aside">
          <span className="eyebrow">INPUT BUFFER</span>
          <h2>
            一次提前的输入，
            <br />
            能等到下一个动作吗？
          </h2>
          <p>角色在 400 ms 时才能执行下个动作。攻击输入可以提前到来，但只会保留一段有限的时间。</p>
          <ol>
            <li>改变缓冲有效期。</li>
            <li>选择按下攻击键的时刻。</li>
            <li>播放后观察输入是被消费，还是过期。</li>
          </ol>
          <Link href="/read/input-buffer">
            阅读机制说明 <ArrowRight size={15} />
          </Link>
          <Link href="/read/writing">
            在文章中插入交互组件 <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </main>
  );
}
