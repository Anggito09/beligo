// Deploy file ini ke Vercel sebagai serverless function: /api/search.js
// Vercel akan expose jadi GET /api/search?q=laptop
// Untuk Cloudflare Workers, porting logic yang sama.

import { marketplaces } from "./scrapers/index.js";

// In-memory cache TTL 15 Menit — di prod ganti Upstash/Vercel KV
const cache = new Map();
const TTL_MS = 15 * 60 * 1000;

const STORES = {
  Shopee: ["Shopee Mall - Official", "Erigo Official Store", "Eiger Official", "Cupang Gallery Official"],
  Tokopedia: ["Tokopedia Official Store", "Eiger Official", "Samsung Official Store", "Aquarium Hobi Official"],
  Blibli: ["Blibli Official Store", "Samsung Official", "Nike Official Store", "Eiger Blibli"],
  Lazada: ["Lazada Flagship Store", "Samsung LazMall", "Lazada Home Appliances"],
  GrabFood: ["Warung Padang Sederhana", "Ayam Geprek Bensu - GrabFood", "Kopi Janji Jiwa GrabFood"],
  GoFood: ["RM Padang Sederhana GoFood", "Bakso Malang Cak Man GoFood", "Sate Taichan GoFood"],
  ShopeeFood: ["Nasi Goreng 88 ShopeeFood", "Martabak Pecenongan ShopeeFood", "Burger King ShopeeFood"],
};

const ALL_PRODUCTS = [
  // nasi padang khusus
  { title:"Nasi Padang Ayam Pop + Rendang + Sayur", price:38000, rating:4.8, sold:7200, source:"GrabFood", store:"Warung Padang Sederhana", url:"#", cat:"nasi padang makanan" },
  { title:"Nasi Padang Rendang Sapi Komplit", price:42000, rating:4.7, sold:5400, source:"GoFood", store:"RM Padang Sederhana GoFood", url:"#", cat:"nasi padang" },
  { title:"Nasi Padang Paket Hemat Ayam + Telur", price:32000, rating:4.6, sold:6100, source:"ShopeeFood", store:"Nasi Goreng 88 ShopeeFood", url:"#", cat:"nasi padang" },
  { title:"Nasi Padang Gulai Tunjang + Nasi", price:45000, rating:4.7, sold:3100, source:"GrabFood", store:"Warung Padang Sederhana", url:"#", cat:"nasi padang" },
  // laptop
  { title:"Lenovo IdeaPad Slim 3 14 - Ryzen 5 8GB 512GB", price:6200000, rating:4.9, sold:2400, source:"Tokopedia", store:"Lenovo Official Store Tokopedia", url:"#", cat:"laptop" },
  { title:"Asus Vivobook 14 A1402 - i5 13th Gen 8GB", price:7400000, rating:4.8, sold:1800, source:"Shopee", store:"ASUS Official Store Shopee Mall", url:"#", cat:"laptop" },
  { title:"Acer Aspire 5 Slim - i3 1215U 8GB", price:5800000, rating:4.6, sold:900, source:"Blibli", store:"Acer Official Store Blibli", url:"#", cat:"laptop" },
  { title:"HP 14s - Ryzen 5 7520U 8GB", price:6950000, rating:4.7, sold:1100, source:"Lazada", store:"HP Flagship Store LazMall", url:"#", cat:"laptop" },
  { title:"Axioo Hype 5 X5 - Ryzen 5 8GB", price:3100000, rating:3.2, sold:320, source:"Shopee", store:"Axioo Official Store", url:"#", cat:"laptop" },
  { title:"Advan Workplus - Ryzen 5 6600H 16GB", price:6400000, rating:4.8, sold:2100, source:"Tokopedia", store:"Advan Official Store", url:"#", cat:"laptop" },
  { title:"MacBook Air M2 256GB - Midnight", price:15999000, rating:4.9, sold:850, source:"Blibli", store:"Apple Authorized Blibli", url:"#", cat:"laptop" },
  { title:"MacBook Pro 14 M3 Pro 18GB 512GB", price:28500000, rating:4.9, sold:420, source:"Tokopedia", store:"Apple Official Tokopedia", url:"#", cat:"laptop" },
  { title:"Infinix Inbook X2 - i3 11th Gen", price:3999000, rating:3.8, sold:560, source:"Lazada", store:"Infinix Flagship Lazada", url:"#", cat:"laptop" },
  { title:"Asus TUF Gaming F15 - i5 RTX 2050", price:10990000, rating:4.7, sold:670, source:"Shopee", store:"ASUS ROG Official Shopee", url:"#", cat:"laptop" },
  { title:"Lenovo ThinkPad X1 Carbon Gen 11 i7 16GB", price:24500000, rating:4.8, sold:90, source:"Blibli", store:"Lenovo ThinkPad Blibli Official", url:"#", cat:"laptop thinkpad" },
  { title:"HP Pavilion Aero 13 Ryzen 7 16GB", price:12900000, rating:4.7, sold:340, source:"Shopee", store:"HP Official Shopee Mall", url:"#", cat:"laptop" },
  // hp samsung & hp umum
  { title:"Samsung Galaxy A55 5G 8/256GB", price:5499000, rating:4.8, sold:3200, source:"Shopee", store:"Samsung Official Store Shopee", url:"#", cat:"hp samsung" },
  { title:"Samsung Galaxy S23 FE 8/256GB", price:7999000, rating:4.7, sold:1500, source:"Tokopedia", store:"Samsung Official Tokopedia", url:"#", cat:"hp samsung" },
  { title:"Samsung Galaxy M54 8/256GB", price:4599000, rating:4.6, sold:980, source:"Blibli", store:"Samsung Blibli Official", url:"#", cat:"hp samsung" },
  { title:"Samsung Galaxy Z Flip5 8/256GB", price:14999000, rating:4.8, sold:420, source:"Lazada", store:"Samsung LazMall Official", url:"#", cat:"hp samsung" },
  { title:"iPhone 15 128GB Garansi Resmi", price:13990000, rating:4.9, sold:2100, source:"Blibli", store:"Apple Authorized Blibli", url:"#", cat:"hp iphone" },
  { title:"Xiaomi Redmi Note 13 Pro 8/256GB", price:3299000, rating:4.7, sold:4300, source:"Shopee", store:"Xiaomi Official Store Shopee", url:"#", cat:"hp xiaomi" },
  // kulkas & elektronik rumah
  { title:"Kulkas 2 Pintu LG 260L Inverter", price:3899000, rating:4.7, sold:760, source:"Tokopedia", store:"LG Official Tokopedia", url:"#", cat:"kulkas" },
  { title:"Kulkas Sharp 2 Pintu 220L J-Tech", price:3299000, rating:4.6, sold:540, source:"Shopee", store:"Sharp Official Shopee", url:"#", cat:"kulkas" },
  { title:"Kulkas Polytron Belleza 180L 2 Pintu", price:2799000, rating:4.4, sold:310, source:"Blibli", store:"Polytron Blibli Official", url:"#", cat:"kulkas" },
  { title:"TV LED 43 inch Samsung 4K UHD", price:4299000, rating:4.7, sold:890, source:"Tokopedia", store:"Samsung TV Official", url:"#", cat:"tv elektronik" },
  { title:"Mesin Cuci LG 8Kg Front Loading", price:3899000, rating:4.6, sold:420, source:"Lazada", store:"LG Home LazMall", url:"#", cat:"mesin cuci elektronik" },
  // headset & aksesoris
  { title:"Headset Gaming Fantech HG11 Captain", price:259000, rating:4.7, sold:5400, source:"Shopee", store:"Fantech Official Shopee", url:"#", cat:"headset gaming" },
  { title:"Headset SteelSeries Arctis 1 Wireless", price:1299000, rating:4.8, sold:890, source:"Tokopedia", store:"SteelSeries Official Tokopedia", url:"#", cat:"headset gaming" },
  { title:"Headset Rexus Vonix F30 Gaming", price:399000, rating:4.5, sold:1200, source:"Blibli", store:"Rexus Blibli Official", url:"#", cat:"headset gaming" },
  { title:"Mouse Gaming Logitech G102 Lightsync", price:199000, rating:4.8, sold:12000, source:"Shopee", store:"Logitech Official Shopee", url:"#", cat:"mouse gaming" },
  { title:"Keyboard Mechanical Rexus Daxa M71", price:699000, rating:4.7, sold:2100, source:"Tokopedia", store:"Rexus Official Tokopedia", url:"#", cat:"keyboard gaming" },
  // makanan & minuman — GrabFood / GoFood / ShopeeFood
  { title:"Ayam Geprek Sambal Bawang + Nasi", price:28000, rating:4.8, sold:8200, source:"GrabFood", store:"Ayam Geprek Bensu GrabFood", url:"#", cat:"makanan ayam geprek" },
  { title:"Bakso Malang Komplit Tetelan", price:35000, rating:4.7, sold:5400, source:"GoFood", store:"Bakso Malang Cak Man GoFood", url:"#", cat:"makanan bakso" },
  { title:"Nasi Goreng Spesial Seafood", price:32000, rating:4.6, sold:6100, source:"ShopeeFood", store:"Nasi Goreng 88 ShopeeFood", url:"#", cat:"makanan nasi goreng" },
  { title:"Kopi Susu Gula Aren 500ml", price:22000, rating:4.8, sold:9300, source:"GrabFood", store:"Kopi Janji Jiwa GrabFood", url:"#", cat:"minuman kopi" },
  { title:"Martabak Manis Coklat Keju", price:45000, rating:4.7, sold:3100, source:"GoFood", store:"Martabak Pecenongan 65B GoFood", url:"#", cat:"makanan martabak" },
  { title:"Sate Ayam Madura 10 Tusuk + Lontong", price:40000, rating:4.6, sold:2700, source:"ShopeeFood", store:"Sate Taichan Senayan ShopeeFood", url:"#", cat:"makanan sate" },
  { title:"Mie Gacoan Level 3 + Es Teh", price:30000, rating:4.5, sold:4800, source:"GrabFood", store:"Mie Gacoan GrabFood - Tidar", url:"#", cat:"makanan mie gacoan" },
  { title:"Burger King Whopper Paket", price:55000, rating:4.6, sold:1900, source:"GoFood", store:"Burger King GoFood Official", url:"#", cat:"makanan burger" },
  // ikan cupang & hewan — Shopee/Tokopedia
  { title:"Ikan Cupang Halfmoon Super Red Jantan", price:45000, rating:4.8, sold:3200, source:"Shopee", store:"Cupang Gallery Official Shopee", url:"#", cat:"ikan cupang hias" },
  { title:"Ikan Cupang Koi Galaxy Multi Colour", price:75000, rating:4.7, sold:1800, source:"Tokopedia", store:"BetFish Official Tokopedia", url:"#", cat:"ikan cupang" },
  { title:"Ikan Cupang Plakat Blue Solid", price:35000, rating:4.6, sold:2100, source:"Blibli", store:"Ikan Hias Blibli Official", url:"#", cat:"ikan cupang" },
  { title:"Aquarium Cupang Mini 15cm + Tanaman", price:85000, rating:4.5, sold:900, source:"Lazada", store:"Aquarium Store LazMall", url:"#", cat:"ikan cupang aquarium" },
  { title:"Pakan Ikan Cupang Premium 50g", price:25000, rating:4.7, sold:5400, source:"Shopee", store:"Pakan Ikan Official Shopee", url:"#", cat:"ikan pakan" },
  // fashion & sepatu
  { title:"iPhone 11 64GB Garansi Resmi", price:6999000, rating:4.8, sold:3400, source:"Shopee", store:"Apple Official Store Shopee", url:"#", cat:"hp iphone 11" },
  { title:"iPhone 11 128GB Second Original", price:5499000, rating:4.6, sold:1200, source:"Tokopedia", store:"iBox Official Tokopedia", url:"#", cat:"hp iphone 11" },
  { title:"Sepatu Sneakers Nike Air Jordan 1 Low", price:1299000, rating:4.8, sold:3400, source:"Tokopedia", store:"Nike Official Store Tokopedia", url:"#", cat:"sepatu sneakers" },
  { title:"Kaos Polos Cotton Combed 30s", price:45000, rating:4.6, sold:15000, source:"Shopee", store:"Erigo Store Shopee", url:"#", cat:"baju kaos fashion" },
  { title:"Tas Ransel Eiger Pria Waterproof", price:399000, rating:4.7, sold:2100, source:"Blibli", store:"Eiger Blibli Official", url:"#", cat:"tas ransel" },
];

function buildUrl(source, title, q){
  // Direct product link: pakai judul produk biar tidak search umum, + fallback search jika produk tidak ada
  const kw = encodeURIComponent(title);
  const qq = encodeURIComponent(q);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const map = {
    Shopee: `https://shopee.co.id/search?keyword=${kw}`,
    Tokopedia: `https://www.tokopedia.com/search?st=product&q=${kw}`,
    Blibli: `https://www.blibli.com/p/${slug}/ps--${kw}`,
    Lazada: `https://www.lazada.co.id/tag/${slug}/`,
    GrabFood: `https://food.grab.com/id/id/restaurant/${slug}`,
    GoFood: `https://gofood.co.id/merchant/${slug}`,
    ShopeeFood: `https://shopee.co.id/shopeefood/${slug}`,
  };
  // Untuk Shopee/Tokopedia search by title lebih akurat direct ke produk
  return map[source] || `https://www.google.com/search?q=${kw}`;
}

function isFoodQuery(q){ return /nasi|ayam|bakso|sate|kopi|padang|mie|martabak|burger|gacoan|cupang.*(pakan)?/i.test(q); }
function isFashionQuery(q){ return /jaket|baju|kaos|sepatu|tas|sneakers|hoodie|bomber|fashion|celana/i.test(q); }
function isPhoneQuery(q){ return /hp|iphone|samsung|xiaomi|galaxy|redmi|oppo|vivo|realme/i.test(q); }
function isLaptopQuery(q){ return /laptop|macbook|thinkpad|vivobook|aspire|pavilion|infinix|asus.*book/i.test(q); }
function getPriceConfig(q){
  const qq = q.toLowerCase();
  if(/iphone\s*11/i.test(qq)) return { base: 6200000, step: 280000, jitter: 180000 }; // iPhone 11 5.8-7.2jt
  if(/iphone\s*15/i.test(qq)) return { base: 13500000, step: 350000, jitter: 200000 }; // iPhone 15 13-14jt
  if(/iphone/i.test(qq)) return { base: 7500000, step: 400000, jitter: 220000 };
  if(/samsung.*a55/i.test(qq)) return { base: 5499000, step: 120000, jitter: 90000 };
  if(/samsung/i.test(qq)) return { base: 5500000, step: 350000, jitter: 180000 };
  if(/xiaomi|redmi/i.test(qq)) return { base: 3200000, step: 180000, jitter: 120000 };
  if(isLaptopQuery(qq)) return { base: 6500000, step: 850000, jitter: 250000 }; // laptop 6-12jt
  if(isPhoneQuery(qq)) return { base: 4500000, step: 400000, jitter: 200000 };
  if(isFashionQuery(qq)) return { base: 180000, step: 35000, jitter: 25000 }; // jaket 180-450rb
  if(isFoodQuery(qq)) return { base: 30000, step: 3500, jitter: 4000 };
  return { base: 250000, step: 40000, jitter: 30000 };
}
function generateSynthetic(q){
  const caps = q.split(/\s+/).map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  const food = isFoodQuery(q);
  const fashion = isFashionQuery(q);
  const phone = isPhoneQuery(q);
  const laptop = isLaptopQuery(q);
  let sources, variants;
  if(food){
    sources = ["GrabFood","GoFood","ShopeeFood","Shopee","Tokopedia","Blibli","Lazada"];
    variants = ["Paket Hemat", "Komplit", "Spesial", "Family", "Original", "Jumbo", "Porsi Besar", "Pedas Manis"];
  } else if(fashion){
    sources = ["Shopee","Tokopedia","Blibli","Lazada","Shopee","Tokopedia","Blibli","Lazada"];
    const fashionVariants = {
      jaket: ["Hoodie Pria", "Bomber Oversize", "Parka Waterproof", "Varsity", "Jeans Denim", "Windbreaker", "Hoodie Zipper", "Bomber Casual"],
      default: ["Polos", "Oversize", "Premium", "Casual", "Slim Fit", "Combed 30s", "Distro", "Original"]
    };
    const key = /jaket/i.test(q) ? "jaket" : "default";
    variants = fashionVariants[key];
  } else if(phone){
    sources = ["Shopee","Tokopedia","Blibli","Lazada","Shopee","Tokopedia","Blibli","Lazada"];
    variants = ["64GB Garansi Resmi", "128GB Garansi Resmi", "128GB Second Original", "256GB Resmi", "Second Mulus", "New Stock", "Best Seller", "Official"];
  } else if(laptop){
    sources = ["Shopee","Tokopedia","Blibli","Lazada","Shopee","Tokopedia","Blibli","Lazada"];
    variants = ["i5 8GB 512GB", "Ryzen 5 8GB", "i3 8GB", "RTX 3050", "M2 256GB", "M3 Pro", "i7 16GB", "Gaming"];
  } else {
    sources = ["Shopee","Tokopedia","Blibli","Lazada","Shopee","Tokopedia","Blibli","Lazada","Shopee","Tokopedia"];
    variants = ["Original", "Premium", "Pro", "Spesial", "Garansi Resmi", "Second Original", "New Stock", "Best Seller", "Official", "Limited"];
  }
  const priceCfg = getPriceConfig(q);
  const count = food ? 18 : 24;
  return Array.from({length: count}, (_,i)=>{
    const src = sources[i % sources.length];
    const variant = variants[i % variants.length];
    const title = `${caps} ${variant}`.trim();
    const titleUniq = i >= variants.length ? `${title} ${i+1}` : title;
    const priceBase = priceCfg.base + (i * priceCfg.step * 0.35);
    const price = priceBase + Math.round((Math.random()-0.5)* priceCfg.jitter);
    const rating = +(4.5 + Math.random()*0.4).toFixed(1);
    const sold = 1200 + Math.floor(Math.random()*4000);
    const cat = q.toLowerCase();
    const store = (STORES[src] && STORES[src][i % STORES[src].length]) || `${src} Official Store`;
    return { title: titleUniq, price: Math.max(9000, Math.round(price/1000)*1000), rating, sold, source: src, store, cat, url: buildUrl(src, titleUniq, q), updatedAt: new Date().toISOString(), valueScore: rating*2 - (price/50000000)*4 + 2 };
  });
}

function pickProducts(q){
  const nq = q.toLowerCase();
  const tokens = nq.split(/\s+/).filter(Boolean);
  // token bermakna = huruf >=2, bukan angka murni (biar "11" tidak match HG11)
  const meaningful = tokens.filter(t=> t.length>=2 && !/^\d+$/.test(t) && t !== "hp" || t==="hp" && tokens.includes("hp"));
  const useTokens = meaningful.length ? meaningful : tokens.filter(t=> t.length>=3);
  let filtered = ALL_PRODUCTS.filter(p => {
    const title = p.title.toLowerCase();
    const cat = p.cat.toLowerCase();
    const combined = `${title} ${cat}`;
    // harus mengandung frasa query atau minimal 1 token bermakna panjang
    if(combined.includes(nq)) return true;
    const hits = useTokens.filter(w => title.includes(w) || cat.includes(w)).length;
    // untuk "hp iphone 11": butuh iphone (wajib) + hp/11 optional
    if(nq.includes("iphone") && !title.includes("iphone")) return false;
    if(nq.includes("samsung") && !title.includes("samsung") && !cat.includes("samsung")) return false;
    return hits >= 1 && (useTokens.length===1 || hits >=1);
  });
  // kalau masih >0 tapi banyak yang tidak relevan (headset muncul karena 11), saring lagi: hapus yang hanya match angka
  if(filtered.length){
    const strict = filtered.filter(p=>{
      const title = p.title.toLowerCase();
      return useTokens.some(w=> title.includes(w) && w.length>=3);
    });
    if(strict.length) filtered = strict;
  }
  if(filtered.length===0){
    filtered = ALL_PRODUCTS.filter(p => tokens.slice(0,1).some(w => p.title.toLowerCase().includes(w) && w.length>=3));
  }
  if(filtered.length===0){
    const synth = generateSynthetic(q);
    return synth.sort((a,b)=>b.valueScore-a.valueScore);
  }
  const isFood = filtered.some(p => ["GrabFood","GoFood","ShopeeFood"].includes(p.source));
  const jitter = () => Math.round((Math.random()-0.5)*(isFood? 6000 : 120000));
  const scored = filtered.map(p=>{
    const title = p.title.toLowerCase();
    const cat = p.cat.toLowerCase();
    const hits = tokens.filter(t=> title.includes(t) || cat.includes(t)).length;
    return { p, hits };
  }).sort((a,b)=> b.hits - a.hits || b.p.rating - a.p.rating);
  let results = scored.map(({p})=>({ ...p, url: buildUrl(p.source, p.title, q), price: Math.max(9000, p.price + jitter()), updatedAt: new Date().toISOString(), valueScore: p.rating*2 - (p.price/50000000)*4 + 2 })).sort((a,b)=>b.valueScore-a.valueScore);
  // jika hasil <20, tambah synthetic biar tampil 20-30 & banyak
  if(results.length < 20){
    const need = 24 - results.length;
    const synth = generateSynthetic(q).slice(0, need);
    results = [...results, ...synth].sort((a,b)=>b.valueScore-a.valueScore);
  }
  // batasi 30 biar tidak overload, tapi tetap 20-30
  return results.slice(0, 30);
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
