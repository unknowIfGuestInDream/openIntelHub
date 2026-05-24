'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import type { NewsItem } from '@/lib/types';
import { NewsCard } from './NewsCard';

const PAGE_SIZE = 24;

interface NewsExplorerProps {
  items: NewsItem[];
}

interface Option {
  value: string;
  label: string;
  count: number;
}

function buildOptions(items: NewsItem[], pick: (i: NewsItem) => string): Option[] {
  const counts = new Map<string, number>();
  for (const i of items) {
    const v = pick(i);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: value, count }));
}

function matchesQuery(item: NewsItem, q: string): boolean {
  if (!q) return true;
  const haystack = [
    item.title,
    item.titleCN ?? '',
    item.summary,
    item.summaryCN ?? '',
    item.source.nameCN,
    item.source.domain,
    item.category,
    ...item.tags,
    ...item.entities.people,
    ...item.entities.orgs,
    ...item.entities.places,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function NewsExplorer({ items }: NewsExplorerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [page, setPage] = useState(1);

  // Defer the heavy filtering work so typing in the search box stays smooth
  // when the article list is large.
  const deferredQuery = useDeferredValue(query);

  const categoryOptions = useMemo(
    () => buildOptions(items, (i) => i.category),
    [items],
  );
  const countryOptions = useMemo(
    () => buildOptions(items, (i) => i.source.country),
    [items],
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!category || i.category === category) &&
        (!country || i.source.country === country) &&
        matchesQuery(i, q),
    );
  }, [items, deferredQuery, category, country]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function reset() {
    setQuery('');
    setCategory('');
    setCountry('');
    setPage(1);
  }

  function update<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const hasFilters = Boolean(query || category || country);

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="news-search" className="sr-only">
            搜索新闻
          </label>
          <input
            id="news-search"
            type="search"
            value={query}
            onChange={(e) => update(setQuery, e.target.value)}
            placeholder="搜索标题、摘要、信息源、标签或实体（如 GitHub、AI）…"
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-brand-500 hover:text-brand-500"
            >
              清除筛选
            </button>
          )}
        </div>

        {categoryOptions.length > 0 && (
          <FilterChips
            label="分类"
            options={categoryOptions}
            value={category}
            onChange={(v) => update(setCategory, v)}
          />
        )}
        {countryOptions.length > 0 && (
          <FilterChips
            label="国家 / 地区"
            options={countryOptions}
            value={country}
            onChange={(v) => update(setCountry, v)}
          />
        )}
      </div>

      <p className="text-sm text-slate-400">
        共 {filtered.length} 篇（共 {items.length} 篇） · 第 {currentPage} / {totalPages} 页
      </p>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.length === 0 ? (
          <p className="col-span-full text-slate-400">未找到匹配的新闻。</p>
        ) : (
          visible.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </section>

      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}

interface FilterChipsProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}

function FilterChips({ label, options, value, onChange }: FilterChipsProps) {
  return (
    <div>
      <h3 className="mb-1 text-xs uppercase tracking-wide text-slate-400">{label}</h3>
      <ul className="flex flex-wrap gap-2 text-xs">
        <li>
          <button
            type="button"
            onClick={() => onChange('')}
            className={chipClass(value === '')}
          >
            全部
          </button>
        </li>
        {options.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onChange(o.value === value ? '' : o.value)}
              className={chipClass(value === o.value)}
            >
              {o.label}
              <span className="ml-1 text-slate-500">{o.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function chipClass(active: boolean): string {
  return [
    'rounded-full border px-3 py-1 transition',
    active
      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
      : 'border-slate-700 text-slate-300 hover:border-brand-500 hover:text-brand-500',
  ].join(' ');
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const pages = pageWindow(page, totalPages);
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 text-sm"
      aria-label="分页"
    >
      <PageButton
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        label="上一页"
      />
      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`gap-${idx}`} className="px-2 text-slate-500">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? 'min-w-[2.25rem] rounded border border-brand-500 bg-brand-500/10 px-2 py-1 text-brand-500'
                : 'min-w-[2.25rem] rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-brand-500 hover:text-brand-500'
            }
          >
            {p}
          </button>
        ),
      )}
      <PageButton
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        label="下一页"
      />
    </nav>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-slate-700 px-3 py-1 text-slate-300 enabled:hover:border-brand-500 enabled:hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/**
 * Produce a compact page list around the current page with ellipses on the
 * ends, e.g. for page=7 / total=20: [1, '…', 5, 6, 7, 8, 9, '…', 20].
 */
function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | '…')[] = [];
  const push = (v: number | '…') => {
    if (out[out.length - 1] !== v) out.push(v);
  };
  push(1);
  const start = Math.max(2, page - 2);
  const end = Math.min(total - 1, page + 2);
  if (start > 2) push('…');
  for (let i = start; i <= end; i++) push(i);
  if (end < total - 1) push('…');
  push(total);
  return out;
}
