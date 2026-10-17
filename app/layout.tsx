import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './globals.css';
import './motion.css';

export const metadata: Metadata = {
  title: { default: 'Starry手册 · Starry 项目文档', template: '%s · Starry手册' },
  description:
    '基于 Unreal Engine 5.8 的 Starry 游戏项目文档，记录技术架构、玩法系统与开发工具，提供功能配置、使用说明和扩展方法。',
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
