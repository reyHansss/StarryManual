import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './globals.css';
import './motion.css';

export const metadata: Metadata = {
  title: { default: 'Starry手册 · 探索系统之间的联系', template: '%s · Starry手册' },
  description: 'Starry 项目手册：AstraAI、HaloDebug 与 Input 的架构、配置使用、扩展与排查。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <RootProvider theme={{ enabled: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
