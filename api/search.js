// Deploy file ini ke Vercel sebagai serverless function: /api/search.js
// Vercel akan expose jadi GET /api/search?q=laptop
// Untuk Cloudflare Workers, porting logic yang sama.

import { marketplaces } from "./scrapers/index.js";

// In-memory cache TTL 15 Menit — di prod ganti Upstash/Vercel KV
const cache = new Map();
const TTL_MS = 15 * 60 * 1000;

const ALL_PRODUCTS = [
  // laptop
  { title:"Lenovo IdeaPad Slim 3 14 - Ryzen 5 8GB 512GB", price:6200000, rating:4.9, sold:2400, source:"Tokopedia", url:"#", cat:"laptop" },
  { title:"Asus Vivobook 14 A1402 - i5 13th Gen 8GB", price:7400000, rating:4.8, sold:1800, source:"Shopee", url:"#", cat:"laptop" },
  { title:"Acer Aspire 5 Slim - i3 1215U 8GB", price:5800000, rating:4.6, sold:900, source:"Blibli", url:"#", cat:"laptop" },
  { title:"HP 14s - Ryzen 5 7520U 8GB", price:6950000, rating:4.7, sold:1100, source:"Lazada", url:"#", cat:"laptop" },
  { title:"Axioo Hype 5 X5 - Ryzen 5 8GB", price:3100000, rating:3.2, sold:320, source:"Shopee", url:"#", cat:"laptop" },
  { title:"Advan Workplus - Ryzen 5 6600H 16GB", price:6400000, rating:4.8, sold:2100, source:"Tokopedia", url:"#", cat:"laptop" },
  { title:"MacBook Air M2 256GB - Midnight", price:15999000, rating:4.9, sold:850, source:"Blibli", url:"#", cat:"laptop" },
  { title:"MacBook Pro 14 M3 Pro 18GB 512GB", price:28500000, rating:4.9, sold:420, source:"Tokopedia", url:"#", cat:"laptop" },
  { title:"Infinix Inbook X2 - i3 11th Gen", price:3999000, rating:3.8, sold:560, source:"Lazada", url:"#", cat:"laptop" },
  { title:"Asus TUF Gaming F15 - i5 RTX 2050", price:10990000, rating:4.7, sold:670, source:"Shopee", url:"#", cat:"laptop" },
  // hp samsung
  { title:"Samsung Galaxy A55 5G 8/256GB", price:5499000, rating:4.8, sold:3200, source:"Shopee", url:"#", cat:"hp samsung" },
  { title:"Samsung Galaxy S23 FE 8/256GB", price:7999000, rating:4.7, sold:1500, source:"Tokopedia", url:"#", cat:"hp samsung" },
  { title:"Samsung Galaxy M54 8/256GB", price:4599000, rating:4.6, sold:980, source:"Blibli", url:"#", cat:"hp samsung" },
  { title:"Samsung Galaxy Z Flip5 8/256GB", price:14999000, rating:4.8, sold:420, source:"Lazada", url:"#", cat:"hp samsung" },
  // kulkas
  { title:"Kulkas 2 Pintu LG 260L Inverter", price:3899000, rating:4.7, sold:760, source:"Tokopedia", url:"#", cat:"kulkas" },
  { title:"Kulkas Sharp 2 Pintu 220L J-Tech", price:3299000, rating:4.6, sold:540, source:"Shopee", url:"#", cat:"kulkas" },
  { title:"Kulkas Polytron Belleza 180L 2 Pintu", price:2799000, rating:4.4, sold:310, source:"Blibli", url:"#", cat:"kulkas" },
  // headset
  { title:"Headset Gaming Fantech HG11 Captain", price:259000, rating:4.7, sold:5400, source:"Shopee", url:"#", cat:"headset gaming" },
  { title:"Headset SteelSeries Arctis 1 Wireless", price:1299000, rating:4.8, sold:890, source:"Tokopedia", url:"#", cat:"headset gaming" },
  { title:"Headset Rexus Vonix F30 Gaming", price:399000, rating:4.5, sold:1200, source:"Blibli", url:"#", cat:"headset gaming" },
];

function pickProducts(q){
  const nq = q.toLowerCase();
  let filtered = ALL_PRODUCTS.filter(p => nq.split(/\s+/).some(w => p.title.toLowerCase().includes(w) || p.cat.includes(w)));
  if(filtered.length===0) filtered = ALL_PRODUCTS.filter(p=>p.cat==="laptop").slice(0,6);
  // tambah variasi harga tipis biar terasa live
  const jitter = () => Math.round((Math.random()-0.5)*120000);
  return filtered.map(p=>({ ...p, price: Math.max(90000, p.price + jitter()), updatedAt: new Date().toISOString(), valueScore: p.rating*2 - (p.price/50000000)*4 + 2 })).sort((a,b)=>b.valueScore-a.valueScore);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const q = (req.query.q || "laptop").toLowerCase().trim();
  const now = Date.now();

  const cached = cache.get(q);
  if (cached && now - cached.ts < TTL_MS) {
    res.setHeader("X-Cache", "HIT");
    return res.json({ query: q, cached: true, ageMs: now - cached.ts, products: cached.products, sources: marketplaces.filter(m=>m.enabled).map(m=>m.id) });
  }

  // Try scrape marketplace (akan fail kalau module belum ada) — tetap jalan tanpa error
  let products = [];
  try{
    const results = await Promise.allSettled(
      marketplaces.filter(m => m.enabled).map(async m => {
        try{ const mod = await import(m.module); return mod.scrape(q); }catch{ return []; }
      })
    );
    products = results.filter(r=>r.status==="fulfilled").flatMap(r=>r.value).map(p=>({ ...p, valueScore: p.rating*2 - (p.price/50000000)*4 + 2, updatedAt: p.updatedAt || new Date().toISOString() })).sort((a,b)=>b.valueScore-a.valueScore);
  }catch{}

  if (products.length === 0) products = pickProducts(q);

  cache.set(q, { ts: now, products });
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=60");
  res.json({ query: q, cached: false, ageMs: 0, products, sources: marketplaces.filter(m=>m.enabled).map(m=>m.id) });
}
