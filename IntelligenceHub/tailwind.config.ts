import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          500: '#2563eb',
          700: '#1d4ed8',
          900: '#0b1d3a',
        },
        risk: {
          low: '#16a34a',
          med: '#f59e0b',
          high: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};

export default config;
