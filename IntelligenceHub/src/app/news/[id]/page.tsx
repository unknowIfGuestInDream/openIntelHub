import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadNews } from '@/lib/data';

export async function generateStaticParams() {
  const data = await loadNews();
  return data.items.map((i) => ({ id: i.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadNews();
  const item = data.items.find((i) => i.id === id);
  if (!item) notFound();

  const cluster = item.clusterId
    ? data.items.filter((i) => i.clusterId === item.clusterId && i.id !== item.id)
    : [];

  return (
    <article className="space-y-6">
      <Link href="/" className="text-sm text-brand-500 hover:underline">
        ← Back
      </Link>
      <header className="space-y-2">
        <div className="text-sm text-slate-400">
          {item.source.flag} {item.source.nameCN} · {item.source.country} ·{' '}
          {new Date(item.publishedAt).toLocaleString()}
        </div>
        <h1 className="text-3xl font-bold text-slate-100">{item.title}</h1>
        <p className="text-slate-300">{item.summary}</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-brand-500 hover:underline"
        >
          Read original →
        </a>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['Importance', item.ai.importanceScore],
            ['Risk', item.ai.riskScore],
            ['Credibility', item.ai.credibility],
            ['Geopolitical', item.ai.geopoliticalImpact],
            ['Market', item.ai.marketImpact],
            ['Military', item.ai.militaryRelevance],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded border border-slate-800 bg-slate-900 p-3">
            <div className="text-xs uppercase text-slate-400">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
          </div>
        ))}
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs uppercase text-slate-400">Sentiment</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{item.ai.sentiment}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs uppercase text-slate-400">Bias</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{item.ai.narrativeBias}</div>
        </div>
      </section>

      {cluster.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Related coverage ({cluster.length})</h2>
          <ul className="space-y-2 text-sm">
            {cluster.map((i) => (
              <li key={i.id}>
                <Link href={`/news/${i.id}/`} className="text-brand-500 hover:underline">
                  {i.source.flag} {i.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
