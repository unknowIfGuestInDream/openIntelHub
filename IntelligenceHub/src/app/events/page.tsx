import Link from 'next/link';
import { loadNews } from '@/lib/data';

export default async function EventsPage() {
  const data = await loadNews();
  // Build cluster groups directly from items so we can show participating sources.
  const grouped = new Map<string, ReturnType<typeof itemSummary>[]>();
  for (const i of data.items) {
    if (!i.clusterId) continue;
    const arr = grouped.get(i.clusterId) ?? [];
    arr.push(itemSummary(i));
    grouped.set(i.clusterId, arr);
  }
  const clusters = [...grouped.entries()]
    .map(([id, arr]) => ({ id, items: arr }))
    .sort((a, b) => b.items.length - a.items.length);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Event clusters</h1>
        <p className="mt-2 text-sm text-slate-400">
          Cross-source events detected by title similarity ({clusters.length} clusters).
        </p>
      </header>

      {clusters.length === 0 && (
        <p className="text-slate-400">No clusters yet — run the collector with more sources.</p>
      )}

      <ul className="space-y-4">
        {clusters.map((c) => (
          <li key={c.id} className="rounded border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Cluster {c.id}</span>
              <span>{c.items.length} sources</span>
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

function itemSummary(i: import('@/lib/types').NewsItem) {
  return { id: i.id, title: i.title, domain: i.source.domain, flag: i.source.flag };
}
