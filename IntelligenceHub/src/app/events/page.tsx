import Link from 'next/link';
import { loadNews } from '@/lib/data';
import type { NewsItem } from '@/lib/types';

interface ClusterItem {
  id: string;
  title: string;
  domain: string;
  flag: string;
  importance: number;
  publishedAt: string;
}

export default async function EventsPage() {
  const data = await loadNews();
  // Build cluster groups directly from items so we can show participating sources.
  const grouped = new Map<string, ClusterItem[]>();
  for (const i of data.items) {
    if (!i.clusterId) continue;
    const arr = grouped.get(i.clusterId) ?? [];
    arr.push(itemSummary(i));
    grouped.set(i.clusterId, arr);
  }
  const clusters = [...grouped.entries()]
    .map(([id, arr]) => {
      // Pick a representative item to act as the cluster's display name:
      // highest importance wins, ties broken by earliest publish time so
      // results are deterministic across rebuilds.
      const sorted = [...arr].sort(
        (a, b) =>
          b.importance - a.importance || a.publishedAt.localeCompare(b.publishedAt),
      );
      const representative = sorted[0];
      return { id, items: arr, representative };
    })
    .sort((a, b) => b.items.length - a.items.length);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">事件聚类</h1>
        <p className="mt-2 text-sm text-slate-400">
          基于标题相似度检测的跨信息源事件（共 {clusters.length} 个聚类）。
        </p>
      </header>

      {clusters.length === 0 && (
        <p className="text-slate-400">暂无聚类 — 请采集更多信息源后再试。</p>
      )}

      <ul className="space-y-4">
        {clusters.map((c) => (
          <li key={c.id} className="rounded border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold leading-snug text-slate-100">
                <Link
                  href={`/news/${c.representative.id}/`}
                  className="hover:text-brand-500 hover:underline"
                >
                  {c.representative.flag} {c.representative.title}
                </Link>
              </h2>
              <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {c.items.length} 个信息源
              </span>
            </div>
            <ul className="space-y-1 text-sm">
              {c.items.map((i) => (
                <li key={i.id}>
                  <Link href={`/news/${i.id}/`} className="text-brand-500 hover:underline">
                    {i.flag} {i.title}
                  </Link>{' '}
                  <span className="text-xs text-slate-500">— {i.domain}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function itemSummary(i: NewsItem): ClusterItem {
  return {
    id: i.id,
    title: i.titleCN ?? i.title,
    domain: i.source.domain,
    flag: i.source.flag,
    importance: i.ai.importanceScore,
    publishedAt: i.publishedAt,
  };
}
