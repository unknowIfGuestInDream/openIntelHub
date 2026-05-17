import Link from 'next/link';
import { loadNews } from '@/lib/data';
import { NewsCard } from '@/components/NewsCard';

export default async function HomePage() {
  const data = await loadNews();
  const topItems = data.items.slice(0, 24);
  const countries = [...new Set(data.items.map((i) => i.source.country))].sort();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-100">Global News Intelligence</h1>
        <p className="mt-2 text-slate-400">
          {data.totalArticles} articles from {data.totalSources} sources · generated{' '}
          {new Date(data.generatedAt).toLocaleString()}
        </p>
      </header>

      {countries.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm uppercase tracking-wide text-slate-400">Filter by country</h2>
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
        {topItems.length === 0 ? (
          <p className="col-span-full text-slate-400">
            No news yet — run <code>npm run collect</code> to populate data.
          </p>
        ) : (
          topItems.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </section>
    </div>
  );
}
