import { loadNews } from '@/lib/data';
import { Chart } from '@/components/Chart';
import type { NarrativeBias, Sentiment } from '@/lib/types';

const BIAS_ORDER: NarrativeBias[] = [
  'left',
  'center-left',
  'center',
  'center-right',
  'right',
  'state',
];
const SENTIMENTS: Sentiment[] = ['negative', 'neutral', 'positive'];

export default async function BiasPage() {
  const data = await loadNews();

  // Bias distribution per outlet (count of items per (domain, bias)).
  const domains = [...new Set(data.items.map((i) => i.source.domain))].sort();
  const matrix: number[][] = domains.map(() => BIAS_ORDER.map(() => 0));
  for (const i of data.items) {
    const di = domains.indexOf(i.source.domain);
    const bi = BIAS_ORDER.indexOf(i.ai.narrativeBias);
    if (di >= 0 && bi >= 0) matrix[di][bi]++;
  }

  // Sentiment split per outlet.
  const sentSeries = SENTIMENTS.map((s) => ({
    name: s,
    type: 'bar' as const,
    stack: 'sent',
    data: domains.map((d) =>
      data.items.filter((i) => i.source.domain === d && i.ai.sentiment === s).length,
    ),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Media bias & sentiment</h1>
        <p className="mt-2 text-sm text-slate-400">
          Comparative view of narrative bias and tone across all configured outlets.
        </p>
      </header>

      <section className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-semibold">Articles per outlet × narrative bias</h2>
        <Chart
          option={{
            backgroundColor: 'transparent',
            tooltip: { position: 'top' },
            grid: { left: 120, bottom: 60 },
            xAxis: { type: 'category', data: BIAS_ORDER },
            yAxis: { type: 'category', data: domains },
            visualMap: {
              min: 0,
              max: Math.max(1, ...matrix.flat()),
              calculable: true,
              orient: 'horizontal',
              left: 'center',
              bottom: 0,
            },
            series: [
              {
                type: 'heatmap',
                data: matrix.flatMap((row, di) => row.map((v, bi) => [bi, di, v])),
                label: { show: true },
              },
            ],
          }}
          height={Math.max(280, domains.length * 32)}
        />
      </section>

      <section className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-semibold">Sentiment split per outlet</h2>
        <Chart
          option={{
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis' },
            legend: { data: SENTIMENTS as unknown as string[] },
            grid: { bottom: 80 },
            xAxis: { type: 'category', data: domains, axisLabel: { rotate: 30 } },
            yAxis: { type: 'value' },
            series: sentSeries,
          }}
        />
      </section>
    </div>
  );
}
