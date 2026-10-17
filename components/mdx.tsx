import defaultComponents from 'fumadocs-ui/mdx';
import { Info } from 'lucide-react';
import { InputBufferDemo } from './input-buffer-demo';
import { BlueprintDemo } from './blueprint-demo';
import { Diagram } from './diagram';

function Note({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <aside className="article-note">
      <Info size={18} />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </aside>
  );
}

export function getMDXComponents() {
  return { ...defaultComponents, Note, InputBufferDemo, BlueprintDemo, Diagram };
}
