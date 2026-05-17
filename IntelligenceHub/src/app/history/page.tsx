import Link from 'next/link';
import { loadHistoryDates, loadNews } from '@/lib/data';

export default async function HistoryIndexPage() {
  const dates = await loadHistoryDates();
  const data = await loadNews();
  const today = (data.generatedAt || new Date().toISOString()).slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">历史日报</h1>
        <p className="mt-2 text-sm text-slate-400">
          每日快照保留最近 30 天 · 当前共 {dates.length} 天
        </p>
      </header>

      {dates.length === 0 ? (
        <p className="text-slate-400">
          暂无历史快照 — 采集器每次运行时会写入当日快照（
          <code>public/data/history/&lt;日期&gt;.json</code>），并自动清理 30 天之前的数据。
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {dates.map((d) => (
            <li key={d}>
              <Link
                href={`/history/${d}/`}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm hover:border-brand-500 hover:text-brand-500"
              >
                <span>{d}</span>
                {d === today && (
                  <span className="rounded bg-brand-500 px-2 py-0.5 text-xs text-white">今日</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
