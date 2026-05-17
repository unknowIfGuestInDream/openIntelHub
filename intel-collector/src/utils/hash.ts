import { createHash } from 'node:crypto';

/** Normalize a URL by stripping common tracking params and trailing slashes. */
export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    const trackingPrefixes = ['utm_', 'fbclid', 'gclid', 'mc_', 'ref_'];
    const params = [...u.searchParams.keys()];
    for (const key of params) {
      if (trackingPrefixes.some((p) => key.toLowerCase().startsWith(p))) {
        u.searchParams.delete(key);
      }
    }
    u.hash = '';
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return input;
  }
}

/** Stable id for an article (sha1 of the normalized URL). */
export function articleId(url: string): string {
  return createHash('sha1').update(normalizeUrl(url)).digest('hex').slice(0, 16);
}

/** sha1 hash of arbitrary string content. */
export function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}
