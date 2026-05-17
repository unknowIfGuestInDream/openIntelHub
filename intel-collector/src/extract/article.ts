import * as cheerio from 'cheerio';

/**
 * Best-effort article body extractor. Tries common semantic containers and
 * falls back to the densest <p> region.
 */
export function extractArticleText(html: string): string {
  const $ = cheerio.load(html);

  // Strip noise
  $('script, style, noscript, iframe, header, footer, nav, aside, form').remove();

  const candidates = [
    'article',
    '[itemprop="articleBody"]',
    '.article-body',
    '.story-body',
    '.entry-content',
    'main',
  ];

  for (const sel of candidates) {
    const text = $(sel).find('p').text().trim();
    if (text.length > 200) return collapseWhitespace(text);
  }

  return collapseWhitespace($('p').text().trim());
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Produce a short (≤ `max` chars) summary from longer text. */
export function makeSummary(text: string, max = 280): string {
  const clean = collapseWhitespace(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'));
  return (lastStop > 80 ? cut.slice(0, lastStop + 1) : cut) + '…';
}
