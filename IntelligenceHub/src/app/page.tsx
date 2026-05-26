import Link from 'next/link';
import { loadNews } from '@/lib/data';
import { formatBeijingDateTime } from '@/lib/datetime';
import { NewsCard } from '@/components/NewsCard';

export default async function HomePage() {
  const data = await loadNews();
  // Only show items from the snapshot's "today" by default; a History entry
  // exposes older daily reports. Fallback to all items when nothing matches
  // (e.g. on first deploy when only seed/sample data is present).
  const today = (data.generatedAt || new Date().toISOString()).slice(0, 10);
  const todayItems = data.items.filter((i) => i.publishedAt.slice(0, 10) === today);
  const baseItems = todayItems.length > 0 ? todayItems : data.items;
  const visible = baseItems.slice(0, 24);
  const hasMore = baseItems.length > visible.length;
  const countries = [...new Set(data.items.map((i) => i.source.country))].sort();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">全球新闻情报</h1>
        <p className="mt-2 text-slate-400">
          {data.totalArticles} 篇文章 · {data.totalSources} 个信息源 · 生成于{' '}
          {formatBeijingDateTime(data.generatedAt)}（北京时间）
        </p>
        <p className="mt-1 text-xs text-slate-500">
          默认仅显示当日（{today}）的新闻 ·{' '}
          <Link href="/all/" className="text-brand-500 hover:underline">
            浏览全部新闻
          </Link>{' '}
          ·{' '}
          <Link href="/history/" className="text-brand-500 hover:underline">
            查看历史日报
          </Link>
        </p>
      </header>

      {countries.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm uppercase tracking-wide text-slate-400">按国家筛选</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {countries.map((c) => (
              <li key={c}>
                <Link
                  href={`/countries/${encodeURIComponent(c)}/`}
                  className="rounded-full border border-slate-700 px-3 py-1 hover:border-brand-500 hover:text-brand-500"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.length === 0 ? (
          <p className="col-span-full text-slate-400">
            暂无新闻 — 请运行 <code>npm run collect</code> 采集数据。
          </p>
        ) : (
          visible.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </section>

      {hasMore && (
        <p className="text-center text-sm">
          <Link
            href="/all/"
            className="inline-block rounded border border-slate-700 px-4 py-2 text-slate-300 hover:border-brand-500 hover:text-brand-500"
          >
            查看全部 {baseItems.length} 篇新闻 →
          </Link>
        </p>
      )}
    </div>
  );
}
