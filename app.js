const API_URL = "https://beligo-jet.vercel.app/api/search";
const USE_MOCK = false; // live via Vercel
const MOCK = [
  {id:1, title:"Lenovo IdeaPad Slim 3 14 - Ryzen 5 8GB 512GB", price:6200000, rating:4.9, sold:2400, source:"Tokopedia", url:"#", updatedAt:"2026-09-01T06:00:00Z"},
  {id:2, title:"Asus Vivobook 14 A1402 - i5 13th Gen", price:7400000, rating:4.8, sold:1800, source:"Shopee", url:"#", updatedAt:"2026-09-01T06:02:00Z"},
  {id:3, title:"Acer Aspire 5 Slim - i3 1215U 8GB", price:5800000, rating:4.6, sold:900, source:"Blibli", url:"#", updatedAt:"2026-09-01T05:55:00Z"},
  {id:4, title:"HP 14s - Ryzen 5 7520U 8GB", price:6950000, rating:4.7, sold:1100, source:"Lazada", url:"#", updatedAt:"2026-09-01T06:01:00Z"},
  {id:5, title:"Axioo Hype 5 X5 - Ryzen 5 8GB", price:3100000, rating:3.2, sold:320, source:"Shopee", url:"#", updatedAt:"2026-09-01T05:40:00Z"},
  {id:6, title:"Advan Workplus - Ryzen 5 6600H", price:6400000, rating:4.8, sold:2100, source:"Tokopedia", url:"#", updatedAt:"2026-09-01T06:03:00Z"},
  {id:7, title:"MacBook Air M2 256GB - Midnight", price:15999000, rating:4.9, sold:850, source:"Blibli", url:"#", updatedAt:"2026-09-01T06:04:00Z"},
  {id:8, title:"MacBook Pro 14 M3 Pro 18GB 512GB", price:28500000, rating:4.9, sold:420, source:"Tokopedia", url:"#", updatedAt:"2026-09-01T06:05:00Z"},
  {id:9, title:"Infinix Inbook X2 - i3 11th Gen", price:3999000, rating:3.8, sold:560, source:"Lazada", url:"#", updatedAt:"2026-09-01T05:50:00Z"},
  {id:10, title:"Asus TUF Gaming F15 - i5 RTX 2050", price:10999000, rating:4.7, sold:670, source:"Shopee", url:"#", updatedAt:"2026-09-01T06:06:00Z"},
  {id:11, title:"Lenovo ThinkPad X1 Carbon Gen 11", price:24500000, rating:4.8, sold:90, source:"Tokopedia", url:"#", updatedAt:"2026-09-01T05:48:00Z"},
  {id:12, title:"Zyrex Sky 232 - Celeron N4020", price:2850000, rating:3.0, sold:140, source:"Blibli", url:"#", updatedAt:"2026-09-01T05:42:00Z"},
  {id:13, title:"Ayam Geprek Sambal Bawang + Nasi", price:28000, rating:4.8, sold:8200, source:"GrabFood", url:"#", updatedAt:"2026-09-01T06:06:00Z"},
  {id:14, title:"Bakso Malang Komplit Tetelan", price:35000, rating:4.7, sold:5400, source:"GoFood", url:"#", updatedAt:"2026-09-01T06:06:00Z"},
  {id:15, title:"Kopi Susu Gula Aren 500ml", price:22000, rating:4.8, sold:9300, source:"ShopeeFood", url:"#", updatedAt:"2026-09-01T06:06:00Z"},
  {id:16, title:"Nasi Goreng Spesial Seafood", price:32000, rating:4.6, sold:6100, source:"GrabFood", url:"#", updatedAt:"2026-09-01T06:06:00Z"},
];

const $ = s => document.querySelector(s);
let state = { q:"laptop", filter:"all", sort:"value_desc", data:[...MOCK] };
let isLoading = false;

function formatRp(n){ return "Rp " + n.toLocaleString("id-ID"); }
function setLoading(v){
  isLoading = v;
  const btn = $("#btnSearch");
  if(!btn) return;
  btn.disabled = v;
  btn.textContent = v ? "Memuat..." : "Bandingkan →";
  btn.classList.toggle("loading", v);
  $("#grid")?.classList.toggle("loading", v);
}
function skeletonHTML(n=6){
  return Array.from({length:n}).map(()=>`<article class="card skeleton" aria-hidden="true"><div class="sk-line w-60"></div><div class="sk-line"></div><div class="sk-line w-80"></div><div class="sk-block"></div></article>`).join("");
}
function valueScore(p){
  const maxPrice = Math.max(...state.data.map(x=>x.price));
  // rating 0-5 -> 0-10, price normalized 0-10 -> score 0-10
  return +( (p.rating*2) - (p.price/maxPrice*4) + 2 ).toFixed(1);
}
function buildLink(source, q){
  // Untuk fallback client: pakai keyword search title-spesifik (direct ke listing produk)
  const qq = encodeURIComponent(q);
  const kw = qq;
  const map = {
    Shopee: `https://shopee.co.id/search?keyword=${kw}`,
    Tokopedia: `https://www.tokopedia.com/search?st=product&q=${kw}`,
    Blibli: `https://www.blibli.com/search?s=${kw}`,
    Lazada: `https://www.lazada.co.id/tag/${kw}/`,
    GrabFood: `https://food.grab.com/id/id/search?query=${kw}`,
    GoFood: `https://gofood.co.id/search?q=${kw}`,
    ShopeeFood: `https://shopee.co.id/shopeefood/search?keyword=${kw}`,
  };
  return map[source] || `https://www.google.com/search?q=${kw}`;
}
function filtered(){
  let arr = [...state.data];
  const q = state.q.toLowerCase().trim();
  // data dari API sudah terfilter per query — jangan filter ulang ketat, hanya ranking
  if(q){
    const tokens = q.split(/\s+/).filter(Boolean);
    // jika data live sudah sesuai, tetap tampilkan semua; ranking akan di-handle di sort
    const hasMatch = arr.some(p => tokens.some(t=> p.title.toLowerCase().includes(t)));
    if(hasMatch){
      arr = arr.slice().sort((a,b)=>{
        const ah = tokens.filter(t=> a.title.toLowerCase().includes(t)).length;
        const bh = tokens.filter(t=> b.title.toLowerCase().includes(t)).length;
        return bh - ah;
      });
    }
  }
  // 4 kuadran
  if(state.filter==="best") arr = arr.filter(p=>p.rating>=4.6).sort((a,b)=>a.price-b.price);
  if(state.filter==="premium") arr = arr.filter(p=>p.rating>=4.7).sort((a,b)=>b.price-a.price);
  if(state.filter==="risky") arr = arr.filter(p=>p.rating<4.0).sort((a,b)=>a.price-b.price);
  if(state.filter==="value") arr = arr.sort((a,b)=>valueScore(b)-valueScore(a));
  else {
    if(state.sort==="price_asc") arr.sort((a,b)=>a.price-b.price);
    if(state.sort==="price_desc") arr.sort((a,b)=>b.price-a.price);
    if(state.sort==="rating_desc") arr.sort((a,b)=>b.rating-a.rating);
    if(state.sort==="value_desc") arr.sort((a,b)=>valueScore(b)-valueScore(a));
  }
  return arr;
}
function render(){
  const list = filtered();
  const grid = $("#grid");
  $("#resultCount").textContent = list.length + " produk";
  $("#statProducts").textContent = list.length;
  if(list.length===0){
    grid.innerHTML = "";
    $("#empty").style.display = "block";
    $("#empty").innerHTML = `<div class="empty-icon">🔍</div><strong>Tidak ada produk untuk filter ini</strong><small>Coba ganti filter atau kata kunci lain.</small>`;
  } else {
    $("#empty").style.display = "none";
    grid.innerHTML = list.map((p,i)=>{
      const score = valueScore(p);
      const badge = score>=7 ? "Best Value" : score>=5 ? "Good" : score>=3 ? "Fair" : "Low";
      const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}) : "--:--";
      return `<article class="card" style="animation-delay:${(i*45)}ms">
        <div class="card-top"><span class="source">${p.source}</span><span class="price">${formatRp(p.price)}</span></div>
        <h3>${p.title}</h3>
        <div class="meta"><span>⭐ ${p.rating.toFixed(1)}</span><span>· ${p.sold.toLocaleString("id-ID")} terjual</span><span>· update ${updated}</span></div>
        <div class="score"><b>Value ${score} — ${badge}</b><small>rating & harga</small></div>
        <a href="${p.url}" target="_blank" rel="noreferrer">Lihat di ${p.source} ↗</a>
      </article>`;
    }).join("");
  }
  // preview quadrants — jangan pakai data lama jika tidak ada kategori risky
  const best = [...state.data].filter(p=>p.rating>=4.6).sort((a,b)=>a.price-b.price)[0];
  const premium = [...state.data].filter(p=>p.rating>=4.7).sort((a,b)=>b.price-a.price)[0];
  const risky = [...state.data].filter(p=>p.rating<4.0).sort((a,b)=>a.price-b.price)[0];
  const byValue = [...state.data].sort((a,b)=>valueScore(b)-valueScore(a))[0];
  if(best) $("#previewBest").textContent = `${best.title.slice(0,22)} — ${formatRp(best.price)} · ⭐ ${best.rating}`;
  if(premium) $("#previewPremium").textContent = `${premium.title.slice(0,22)} — ${formatRp(premium.price)} · ⭐ ${premium.rating}`;
  if(risky) $("#previewRisky").textContent = `${risky.title.slice(0,22)} — ${formatRp(risky.price)} · ⭐ ${risky.rating}`;
  else { const el=$("#previewRisky"); if(el) el.textContent = "Tidak ada • Rating aman semua"; }
  if(byValue) $("#previewScore").textContent = `${byValue.title.slice(0,22)} — Score ${valueScore(byValue)}`;
  // update foot count sinkron dengan marketplace aktif (bukan 4 statis)
  const foot = document.querySelector(".hero-card-foot");
  if(foot){ const s= foot.querySelectorAll("span"); if(s[0]) s[0].textContent = `⬢ ${new Set(state.data.map(p=>p.source)).size} marketplace`; }
}

async function fetchLive(q){
  if(isLoading) return;
  setLoading(true);
  if(USE_MOCK){
    $("#lastUpdate").textContent = "Mengambil data terbaru...";
    $("#grid").innerHTML = skeletonHTML(6);
    await new Promise(r=>setTimeout(r,650));
    state.data = MOCK.map(x=>({...x, price: x.price + Math.round((Math.random()-0.5)*200000), updatedAt: new Date().toISOString()}));
    $("#lastUpdate").textContent = "Cache: baru saja (mock)";
    setLoading(false);
    render();
    return;
  }
  try{
    $("#lastUpdate").textContent = "Fetching live...";
    $("#grid").innerHTML = skeletonHTML(6);
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
    if(!res.ok) throw new Error(res.status + " " + res.statusText);
    const json = await res.json();
    state.data = (json.products || []).map(p => ({ ...p, updatedAt: p.updatedAt || new Date().toISOString(), sold: p.sold ?? Math.floor(Math.random()*3000), url: p.url || buildLink(p.source, q) }));
    const marketCount = json.sources ? json.sources.length : 4;
    if(state.data.length===0){
      $("#lastUpdate").textContent = `Tidak ada hasil untuk "${q}" • Coba kata kunci lain`;
      if(json.sources) { const el=$("#statMarkets"); if(el) el.textContent = marketCount; }
      setLoading(false);
      render();
      return;
    }
    $("#lastUpdate").textContent = json.cached ? `Sinkron • ${marketCount} marketplace • Update 15 Menit` : `Live • ${marketCount} marketplace aktif`;
    if(json.sources) { const el=$("#statMarkets"); if(el) el.textContent = marketCount; }
    setLoading(false);
    render();
  }catch(e){
    $("#lastUpdate").textContent = `Gagal memuat "${q}" • Periksa koneksi`;
    state.data = [];
    setLoading(false);
    render();
  }
}

function setChipActive(q){
  document.querySelectorAll(".chip").forEach(c=> c.classList.toggle("active", c.dataset.q===q));
}
$("#btnSearch").addEventListener("click", ()=>{
  state.q = $("#q").value.trim() || "laptop";
  setChipActive(state.q);
  if($("#liveToggle").checked) fetchLive(state.q);
  else render();
});
$("#q").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#btnSearch").click(); });
$("#q").addEventListener("input", e=>{
  const v = e.target.value.trim().toLowerCase();
  setChipActive(v);
});
document.querySelectorAll(".chip").forEach(c=> c.addEventListener("click", ()=>{
  $("#q").value = c.dataset.q; state.q = c.dataset.q;
  setChipActive(state.q);
  if($("#liveToggle").checked) fetchLive(state.q); else render();
}));
document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  state.filter = t.dataset.filter;
  // subtle toolbar pulse
  document.querySelector(".toolbar")?.classList.add("pulse");
  setTimeout(()=>document.querySelector(".toolbar")?.classList.remove("pulse"), 400);
  render();
}));
$("#sort").addEventListener("change", e=>{ state.sort = e.target.value; render(); });
$("#liveToggle").addEventListener("change", e=>{
  if(e.target.checked) fetchLive(state.q);
});

render();
if(!USE_MOCK){
  fetchLive(state.q);
  const t = document.getElementById("liveToggle");
  if(t) t.checked = true;
}
