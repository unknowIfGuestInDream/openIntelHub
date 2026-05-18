import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadNews } from '@/lib/data';
import type { NarrativeBias, Sentiment } from '@/lib/types';

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: '正面',
  neutral: '中性',
  negative: '负面',
};

const BIAS_LABEL: Record<NarrativeBias, string> = {
  left: '左翼',
  'center-left': '中左',
  center: '中立',
  'center-right': '中右',
  right: '右翼',
  state: '官方',
};

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
        ← 返回
      </Link>
      <header className="space-y-2">
        <div className="text-sm text-slate-400">
          {item.source.flag} {item.source.nameCN} · {item.source.country} ·{' '}
          {new Date(item.publishedAt).toLocaleString('zh-CN')}
        </div>
        <h1 className="text-3xl font-bold text-slate-100">{item.titleCN ?? item.title}</h1>
        {item.titleCN && (
          <p className="text-sm text-slate-500" lang={item.language}>
            原文标题：{item.title}
          </p>
        )}
        <p className="text-slate-300">{item.summaryCN ?? item.summary}</p>
        {item.summaryCN && (
          <p className="text-xs text-slate-500" lang={item.language}>
            {item.summary}
          </p>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-brand-500 hover:underline"
        >
          阅读原文 →
        </a>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['重要性', item.ai.importanceScore],
            ['风险', item.ai.riskScore],
            ['可信度', item.ai.credibility],
            ['地缘影响', item.ai.geopoliticalImpact],
            ['市场影响', item.ai.marketImpact],
            ['军事相关', item.ai.militaryRelevance],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded border border-slate-800 bg-slate-900 p-3">
            <div className="text-xs uppercase text-slate-400">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
          </div>
        ))}
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs uppercase text-slate-400">情感</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">
            {SENTIMENT_LABEL[item.ai.sentiment] ?? item.ai.sentiment}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs uppercase text-slate-400">偏向</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">
            {BIAS_LABEL[item.ai.narrativeBias] ?? item.ai.narrativeBias}
          </div>
        </div>
      </section>

      {cluster.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">相关报道（{cluster.length}）</h2>
          <ul className="space-y-2 text-sm">
            {cluster.map((i) => (
              <li key={i.id}>
                <Link href={`/news/${i.id}/`} className="text-brand-500 hover:underline">
                  {i.source.flag} {i.titleCN ?? i.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
