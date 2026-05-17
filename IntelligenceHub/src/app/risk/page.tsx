import { loadNews } from '@/lib/data';
import { Chart } from '@/components/Chart';

export default async function RiskPage() {
  const data = await loadNews();

  // Risk trend: bucket items by day, take max risk in each bucket.
  const byDay = new Map<string, number>();
  for (const i of data.items) {
    const day = i.publishedAt.slice(0, 10);
    byDay.set(day, Math.max(byDay.get(day) ?? 0, i.ai.riskScore));
  }
  const days = [...byDay.keys()].sort();
  const trend = days.map((d) => byDay.get(d) ?? 0);

  // Per-country max risk for a horizontal bar.
  const byCountry = new Map<string, number>();
  for (const i of data.items) {
    byCountry.set(
      i.source.country,
      Math.max(byCountry.get(i.source.country) ?? 0, i.ai.riskScore),
    );
  }
  const countries = [...byCountry.entries()].sort((a, b) => a[1] - b[1]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">AI 风险分析</h1>
        <p className="mt-2 text-sm text-slate-400">
          基于 AI 评分层得出的地缘政治与安全风险趋势。
        </p>
      </header>

      <section className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-semibold">风险趋势（每日峰值）</h2>
        <Chart
          option={{
            backgroundColor: 'transparent',
            xAxis: { type: 'category', data: days },
            yAxis: { type: 'value', max: 100 },
            tooltip: { trigger: 'axis' },
            series: [{ type: 'line', smooth: true, data: trend, areaStyle: {} }],
          }}
        />
      </section>

      <section className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-semibold">各国风险峰值</h2>
        <Chart
          option={{
            backgroundColor: 'transparent',
            grid: { left: 120 },
            xAxis: { type: 'value', max: 100 },
            yAxis: { type: 'category', data: countries.map((c) => c[0]) },
            tooltip: { trigger: 'axis' },
            series: [{ type: 'bar', data: countries.map((c) => c[1]) }],
          }}
          height={Math.max(240, countries.length * 28)}
        />
      </section>
    </div>
  );
}
