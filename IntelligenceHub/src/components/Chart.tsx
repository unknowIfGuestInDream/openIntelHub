'use client';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export function Chart({ option, height = 360 }: { option: EChartsOption; height?: number }) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      theme="dark"
      notMerge
      lazyUpdate
    />
  );
}
