import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadHistoryDates, loadNews, loadNewsForDate } from '@/lib/data';
import { NewsCard } from '@/components/NewsCard';

export async function generateStaticParams() {
  const dates = await loadHistoryDates();
  if (dates.length > 0) return dates.map((date) => ({ date }));
  // No history snapshots yet — fall back to today's date from the latest
  // collector output so the route is still buildable for static export.
  const data = await loadNews();
  const fallback = (data.generatedAt || new Date().toISOString()).slice(0, 10);
  return [{ date: fallback }];
}

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function HistoryDatePage({ params }: PageProps) {
  const { date } = await params;
  let data = await loadNewsForDate(date);
  if (!data) {
    // Fall back to the latest snapshot when the historical file is missing
    // but the requested date matches its generatedAt day (first-build case).
    const latest = await loadNews();
    if (latest.generatedAt.slice(0, 10) === date) {
      data = latest;
    }
  }
  if (!data) notFound();

  // The snapshot is the full collection at that build time. To present a
  // "daily report" for `date`, prefer items actually published that day; if
  // none, fall back to the full snapshot so the page is never empty.
  const dayItems = data.items.filter((i) => i.publishedAt.slice(0, 10) === date);
  const items = dayItems.length > 0 ? dayItems : data.items;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/history/" className="text-sm text-brand-500 hover:underline">
          ← 返回历史日报
        </Link>
        <h1 className="text-3xl font-bold text-slate-100">{date} 日报</h1>
        <p className="text-sm text-slate-400">
          快照生成于 {new Date(data.generatedAt).toLocaleString('zh-CN')} · 共 {items.length} 篇
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <NewsCard key={i.id} item={i} />
        ))}
      </section>
    </div>
  );
}
