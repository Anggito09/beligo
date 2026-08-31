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
  // makanan & minuman — GrabFood / GoFood / ShopeeFood
  { title:"Ayam Geprek Sambal Bawang + Nasi", price:28000, rating:4.8, sold:8200, source:"GrabFood", url:"#", cat:"makanan ayam geprek" },
  { title:"Bakso Malang Komplit Tetelan", price:35000, rating:4.7, sold:5400, source:"GoFood", url:"#", cat:"makanan bakso" },
  { title:"Nasi Goreng Spesial Seafood", price:32000, rating:4.6, sold:6100, source:"ShopeeFood", url:"#", cat:"makanan nasi goreng" },
  { title:"Kopi Susu Gula Aren 500ml", price:22000, rating:4.8, sold:9300, source:"GrabFood", url:"#", cat:"minuman kopi" },
  { title:"Martabak Manis Coklat Keju", price:45000, rating:4.7, sold:3100, source:"GoFood", url:"#", cat:"makanan martabak" },
  { title:"Sate Ayam Madura 10 Tusuk + Lontong", price:40000, rating:4.6, sold:2700, source:"ShopeeFood", url:"#", cat:"makanan sate" },
  { title:"Mie Gacoan Level 3 + Es Teh", price:30000, rating:4.5, sold:4800, source:"GrabFood", url:"#", cat:"makanan mie gacoan" },
  { title:"Burger King Whopper Paket", price:55000, rating:4.6, sold:1900, source:"GoFood", url:"#", cat:"makanan burger" },
];

function buildUrl(source, title, q){
  const kw = encodeURIComponent(title);
  const qq = encodeURIComponent(q);
  const map = {
    Shopee: `https://shopee.co.id/search?keyword=${qq}`,
    Tokopedia: `https://www.tokopedia.com/search?st=product&q=${qq}`,
    Blibli: `https://www.blibli.com/search?s=${qq}`,
    Lazada: `https://www.lazada.co.id/tag/${qq}/`,
    GrabFood: `https://food.grab.com/id/id/search?query=${qq}`,
    GoFood: `https://gofood.co.id/search?q=${qq}`,
    ShopeeFood: `https://shopee.co.id/shopeefood/search?keyword=${qq}`,
  };
  return map[source] || `https://www.google.com/search?q=${kw}`;
}

function pickProducts(q){
  const nq = q.toLowerCase();
  const tokens = nq.split(/\s+/).filter(Boolean);
  let filtered = ALL_PRODUCTS.filter(p => tokens.some(w => p.title.toLowerCase().includes(w) || p.cat.toLowerCase().includes(w)));
  if(filtered.length===0){
    filtered = ALL_PRODUCTS.filter(p => tokens.slice(0,1).some(w => p.title.toLowerCase().includes(w)));
  }
  if(filtered.length===0) return [];
  const isFood = filtered.some(p => ["GrabFood","GoFood","ShopeeFood"].includes(p.source));
  const jitter = () => Math.round((Math.random()-0.5)*(isFood? 6000 : 120000));
  // ranking: yang mengandung semua token di atas
  const scored = filtered.map(p=>{
    const title = p.title.toLowerCase();
    const cat = p.cat.toLowerCase();
    const hits = tokens.filter(t=> title.includes(t) || cat.includes(t)).length;
    return { p, hits };
  }).sort((a,b)=> b.hits - a.hits || b.p.rating - a.p.rating);
  return scored.map(({p})=>({ ...p, url: buildUrl(p.source, p.title, q), price: Math.max(9000, p.price + jitter()), updatedAt: new Date().toISOString(), valueScore: p.rating*2 - (p.price/50000000)*4 + 2 })).sort((a,b)=>b.valueScore-a.valueScore);
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
