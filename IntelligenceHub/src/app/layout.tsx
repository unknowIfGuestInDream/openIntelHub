import type { Metadata } from 'next';
import '../styles/globals.css';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'OpenIntelHub — Global News Intelligence',
  description:
    'AI-driven analysis of global news from 15+ international media outlets — risk scoring, sentiment, geopolitical impact, narrative bias.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          Built with OpenIntelHub · Data rebuilt automatically by GitHub Actions
        </footer>
      </body>
    </html>
  );
}
