import type { Metadata } from 'next';
import '../styles/globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: '全球新闻情报',
  description:
    'AI 驱动的全球新闻分析平台，聚合国际媒体，提供风险评分、情感倾向、地缘政治影响与叙事偏向分析。',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          <p className="footer-beian flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-500"
            >
              辽ICP备2021000033号
            </a>
            <a
              className="footer-beian-police inline-flex items-center gap-1 hover:text-brand-500"
              href="https://beian.mps.gov.cn/#/query/webSearch?code=21020302000532"
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="备案"
                loading="lazy"
                width={14}
                height={14}
                decoding="async"
                className="footer-beian-icon"
                src="/beian.png"
              />
              辽公网安备21020302000532号
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
