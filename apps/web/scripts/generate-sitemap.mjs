#!/usr/bin/env node
/**
 * Writes dist/sitemap.xml and an absolute Sitemap line in dist/robots.txt.
 * Uses VITE_SITE_URL from the repo-root .env (or the environment). Room detail
 * pages are added when the API is reachable at build time (SITEMAP_API_URL).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../dist');

async function rootEnv() {
  try {
    const raw = await readFile(path.resolve(here, '../../../.env'), 'utf8');
    return Object.fromEntries(raw.split('\n').filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
  } catch {
    return {};
  }
}

const env = { ...(await rootEnv()), ...process.env };
const site = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const paths = ['/', '/stay', '/experiences', '/gallery', '/about', '/contact', '/book', '/privacy'];

if (env.SITEMAP_API_URL) {
  try {
    const res = await fetch(`${env.SITEMAP_API_URL.replace(/\/$/, '')}/rooms`, { signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    if (body.ok) for (const r of body.data) paths.push(`/stay/${r.slug}`);
  } catch {
    console.warn('sitemap: API not reachable, room pages skipped');
  }
}

const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${site}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
await writeFile(path.join(dist, 'sitemap.xml'), xml);
const robots = (await readFile(path.join(dist, 'robots.txt'), 'utf8')).replace(/^Sitemap:.*$/m, `Sitemap: ${site}/sitemap.xml`);
await writeFile(path.join(dist, 'robots.txt'), robots);
console.log(`sitemap: ${paths.length} URLs for ${site}`);
