import Link from 'next/link';
import type { NewsItem } from '@/lib/types';

function riskColor(score: number): string {
  if (score >= 60) return 'bg-risk-high';
  if (score >= 30) return 'bg-risk-med';
  return 'bg-risk-low';
}

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition hover:border-brand-500">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {item.source.flag} {item.source.nameCN}
        </span>
        <time dateTime={item.publishedAt}>
          {new Date(item.publishedAt).toLocaleString()}
        </time>
      </div>
      <Link href={`/news/${item.id}/`} className="block">
        <h3 className="text-lg font-semibold text-slate-100 hover:text-brand-500">{item.title}</h3>
      </Link>
      <p className="mt-2 line-clamp-3 text-sm text-slate-300">{item.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded px-2 py-0.5 text-white ${riskColor(item.ai.riskScore)}`}>
          Risk {item.ai.riskScore}
        </span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
          Importance {item.ai.importanceScore}
        </span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
          {item.ai.sentiment}
        </span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-200">
          {item.category}
        </span>
      </div>
    </article>
  );
}
