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

  let products = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value)
    .map(p => ({ ...p, valueScore: p.rating * 2 - (p.price / 50000000) * 4 + 2 }))
    .sort((a, b) => b.valueScore - a.valueScore);

  // Fallback mock jika scraper belum diisi / semua gagal — biar Vercel tetap return data
  if (products.length === 0) {
    products = [
      { title:"Lenovo IdeaPad Slim 3 14 - Ryzen 5", price:6200000, rating:4.9, sold:2400, source:"Tokopedia", url:"#" },
      { title:"Acer Aspire 5 Slim - i3", price:5800000, rating:4.6, sold:900, source:"Blibli", url:"#" },
      { title:"MacBook Pro 14 M3 Pro", price:28500000, rating:4.9, sold:420, source:"Tokopedia", url:"#" },
    ].filter(p => p.title.toLowerCase().includes(q) || q==="laptop")
     .map(p => ({ ...p, valueScore: p.rating * 2 - (p.price / 50000000) * 4 + 2 }));
  }

  cache.set(q, { ts: now, products });
  res.json({ query: q, cached: false, products, sources: marketplaces.filter(m=>m.enabled).map(m=>m.id) });
}
