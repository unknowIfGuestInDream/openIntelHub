import { notFound } from 'next/navigation';
import { loadNews } from '@/lib/data';
import { NewsCard } from '@/components/NewsCard';

export async function generateStaticParams() {
  const data = await loadNews();
  const countries = new Set(data.items.map((i) => i.source.country));
  return [...countries].map((country) => ({ country }));
}

interface PageProps {
  params: Promise<{ country: string }>;
}

export default async function CountryPage({ params }: PageProps) {
  const { country } = await params;
  const decoded = decodeURIComponent(country);
  const data = await loadNews();
  const items = data.items.filter((i) => i.source.country === decoded);
  if (items.length === 0) notFound();

  const avgRisk = Math.round(items.reduce((a, b) => a + b.ai.riskScore, 0) / items.length);
  const avgGeo = Math.round(items.reduce((a, b) => a + b.ai.geopoliticalImpact, 0) / items.length);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{decoded}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {items.length} articles · avg risk {avgRisk} · avg geopolitical impact {avgGeo}
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
