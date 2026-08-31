// Deploy file ini ke Vercel sebagai serverless function: /api/search.js
// Vercel akan expose jadi GET /api/search?q=laptop
// Untuk Cloudflare Workers, porting logic yang sama.

import { marketplaces } from "./scrapers/index.js";

// Simple in-memory cache. Di produksi ganti dengan Upstash Redis / Vercel KV dengan TTL 15 menit.
const cache = new Map();
const TTL_MS = 15 * 60 * 1000;

export default async function handler(req, res) {
  const q = (req.query.q || "laptop").toLowerCase().trim();
  const now = Date.now();

  const cached = cache.get(q);
  if (cached && now - cached.ts < TTL_MS) {
    return res.json({ query: q, cached: true, ageMs: now - cached.ts, products: cached.products });
  }

  // Parallel scrape semua marketplace yang enabled
  const results = await Promise.allSettled(
    marketplaces.filter(m => m.enabled).map(async m => {
      const mod = await import(m.module);
      return mod.scrape(q);
    })
  );

  const products = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value)
    .map(p => ({ ...p, valueScore: p.rating * 2 - (p.price / 50000000) * 4 + 2 }))
    .sort((a, b) => b.valueScore - a.valueScore);

  cache.set(q, { ts: now, products });
  res.json({ query: q, cached: false, products, sources: marketplaces.filter(m=>m.enabled).map(m=>m.id) });
}
