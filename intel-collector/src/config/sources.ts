import type { MediaSource } from '../types.js';

/**
 * Registry of supported global media sources.
 *
 * Adding a new source is as simple as appending an entry here — the rest of
 * the pipeline (fetcher, dedupe, analyzer) is source-agnostic.
 */
export const SOURCES: MediaSource[] = [
  {
    domain: 'aa.com.tr',
    nameCN: '阿纳多卢通讯社',
    country: 'Turkey',
    flag: '🇹🇷',
    accessibleInChina: true,
    language: 'en',
    feeds: ['https://www.aa.com.tr/en/rss/default?cat=guncel'],
  },
  {
    domain: 'abc.net.au',
    nameCN: '澳大利亚广播公司',
    country: 'Australia',
    flag: '🇦🇺',
    accessibleInChina: false,
    language: 'en',
    feeds: ['https://www.abc.net.au/news/feed/45910/rss.xml'],
  },
  {
    domain: 'aljazeera.com',
    nameCN: '半岛电视台',
    country: 'Qatar',
    flag: '🇶🇦',
    accessibleInChina: true,
    language: 'en',
    feeds: ['https://www.aljazeera.com/xml/rss/all.xml'],
  },
  {
    domain: 'bbc.com',
    nameCN: '英国广播公司',
    country: 'UK',
    flag: '🇬🇧',
    accessibleInChina: false,
    language: 'en',
    feeds: ['https://feeds.bbci.co.uk/news/world/rss.xml'],
  },
  {
    domain: 'cbc.ca',
    nameCN: '加拿大广播公司',
    country: 'Canada',
    flag: '🇨🇦',
    accessibleInChina: false,
    language: 'en',
    feeds: ['https://www.cbc.ca/webfeed/rss/rss-topstories'],
  },
  {
    domain: 'chinanews.com',
    nameCN: '中国新闻网',
    country: 'China',
    flag: '🇨🇳',
    accessibleInChina: true,
    language: 'zh',
    feeds: ['https://www.chinanews.com.cn/rss/scroll-news.xml'],
  },
  {
    domain: 'dw.com',
    nameCN: '德国之声',
    country: 'Germany',
    flag: '🇩🇪',
    accessibleInChina: false,
    language: 'en',
    feeds: ['https://rss.dw.com/rdf/rss-en-all'],
  },
  {
    domain: 'elpais.com',
    nameCN: '国家报',
    country: 'Spain',
    flag: '🇪🇸',
    accessibleInChina: false,
    language: 'es',
    feeds: ['https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'],
  },
  {
    domain: 'investing.com',
    nameCN: '英为财情',
    country: 'International',
    flag: '🌍',
    accessibleInChina: true,
    language: 'en',
    feeds: ['https://www.investing.com/rss/news.rss'],
  },
  {
    domain: 'news.cn',
    nameCN: '新华网',
    country: 'China',
    flag: '🇨🇳',
    accessibleInChina: true,
    language: 'zh',
    feeds: ['http://www.news.cn/world/news_world.xml'],
  },
  {
    domain: 'nhk.or.jp',
    nameCN: '日本广播协会',
    country: 'Japan',
    flag: '🇯🇵',
    accessibleInChina: true,
    language: 'ja',
    feeds: ['https://www3.nhk.or.jp/rss/news/cat0.xml'],
  },
  {
    domain: 'ntv.com.tr',
    nameCN: '土耳其主流媒体 NTV',
    country: 'Turkey',
    flag: '🇹🇷',
    accessibleInChina: true,
    language: 'tr',
    feeds: ['https://www.ntv.com.tr/dunya.rss'],
  },
  {
    domain: 'rfi.fr',
    nameCN: '法国国际广播电台',
    country: 'France',
    flag: '🇫🇷',
    accessibleInChina: false,
    language: 'fr',
    feeds: ['https://www.rfi.fr/fr/rss'],
  },
  {
    domain: 'tass.com',
    nameCN: '塔斯社',
    country: 'Russia',
    flag: '🇷🇺',
    accessibleInChina: true,
    language: 'en',
    feeds: ['https://tass.com/rss/v2.xml'],
  },
  {
    domain: 'voanews.com',
    nameCN: '美国之音',
    country: 'USA',
    flag: '🇺🇸',
    accessibleInChina: false,
    language: 'en',
    feeds: ['https://www.voanews.com/api/zmgqoe$omi'],
  },
];

export function getSourceByDomain(domain: string): MediaSource | undefined {
  return SOURCES.find((s) => s.domain === domain);
}
