'use client';

import { useSyncExternalStore } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function getPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

function subscribeToPrefersDark(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;

  const mq = window.matchMedia(COLOR_SCHEME_QUERY);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

export function Chart({ option, height = 360 }: { option: EChartsOption; height?: number }) {
  // Match the chart palette to the user's OS-level color scheme preference.
  const dark = useSyncExternalStore(subscribeToPrefersDark, getPrefersDark, () => true);

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
