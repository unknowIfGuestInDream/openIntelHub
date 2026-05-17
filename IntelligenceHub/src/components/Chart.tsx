'use client';

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

function getPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function Chart({ option, height = 360 }: { option: EChartsOption; height?: number }) {
  // Match the chart palette to the user's OS-level color scheme preference.
  const [dark, setDark] = useState<boolean>(true);
  useEffect(() => {
    setDark(getPrefersDark());
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      theme={dark ? 'dark' : undefined}
      notMerge
      lazyUpdate
    />
  );
}
