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
];

const $ = s => document.querySelector(s);
let state = { q:"laptop", filter:"all", sort:"value_desc", data:[...MOCK] };

function formatRp(n){ return "Rp " + n.toLocaleString("id-ID"); }
function valueScore(p){
  const maxPrice = Math.max(...state.data.map(x=>x.price));
  // rating 0-5 -> 0-10, price normalized 0-10 -> score 0-10
  return +( (p.rating*2) - (p.price/maxPrice*4) + 2 ).toFixed(1);
}
function filtered(){
  let arr = [...state.data];
  const q = state.q.toLowerCase();
  if(q) arr = arr.filter(p => p.title.toLowerCase().includes(q));
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
  $("#resultCount").textContent = list.length + " produk";
  $("#statProducts").textContent = list.length;
  $("#grid").innerHTML = list.map(p=>{
    const score = valueScore(p);
    const badge = score>=7 ? "Best Value" : score>=5 ? "Good" : score>=3 ? "Fair" : "Low";
    return `<article class="card">
      <div class="card-top"><span class="source">${p.source}</span><span class="price">${formatRp(p.price)}</span></div>
      <h3>${p.title}</h3>
      <div class="meta"><span>⭐ ${p.rating.toFixed(1)}</span><span>· ${p.sold.toLocaleString("id-ID")} terjual</span><span>· update ${new Date(p.updatedAt).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span></div>
      <div class="score"><b>Value ${score} — ${badge}</b><small>rating & harga</small></div>
      <a href="${p.url}" target="_blank" rel="noreferrer">Lihat di ${p.source} ↗</a>
    </article>`;
  }).join("");
  $("#empty").style.display = list.length? "none":"block";
  // preview quadrants
  const best = [...state.data].filter(p=>p.rating>=4.6).sort((a,b)=>a.price-b.price)[0];
  const premium = [...state.data].filter(p=>p.rating>=4.7).sort((a,b)=>b.price-a.price)[0];
  const risky = [...state.data].filter(p=>p.rating<4.0).sort((a,b)=>a.price-b.price)[0];
  const byValue = [...state.data].sort((a,b)=>valueScore(b)-valueScore(a))[0];
  if(best) $("#previewBest").textContent = `${best.title.slice(0,22)} — ${formatRp(best.price)} · ⭐ ${best.rating}`;
  if(premium) $("#previewPremium").textContent = `${premium.title.slice(0,22)} — ${formatRp(premium.price)} · ⭐ ${premium.rating}`;
  if(risky) $("#previewRisky").textContent = `${risky.title.slice(0,22)} — ${formatRp(risky.price)} · ⭐ ${risky.rating}`;
  if(byValue) $("#previewScore").textContent = `${byValue.title.slice(0,22)} — Score ${valueScore(byValue)}`;
}

async function fetchLive(q){
  if(USE_MOCK){
    // simulasi delay live fetch
    $("#lastUpdate").textContent = "Mengambil data terbaru...";
    await new Promise(r=>setTimeout(r,700));
    state.data = MOCK.map(x=>({...x, price: x.price + Math.round((Math.random()-0.5)*200000)}));
    $("#lastUpdate").textContent = "Cache: baru saja (mock)";
    render();
    return;
  }
  try{
    $("#lastUpdate").textContent = "Fetching live...";
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
    if(!res.ok) throw new Error(res.status);
    const json = await res.json();
    // normalisasi updatedAt jika tidak ada
    state.data = (json.products || []).map(p => ({ ...p, updatedAt: p.updatedAt || new Date().toISOString() }));
    if(state.data.length===0) throw new Error("empty");
    $("#lastUpdate").textContent = `Live: ${json.cached ? "cache 15m" : "fresh"} · ${json.sources ? json.sources.join(", ") : "vercel"}`;
    render();
  }catch(e){
    $("#lastUpdate").textContent = "Gagal fetch live, pakai cache mock";
    state.data = MOCK.map(x=>({...x, price: x.price + Math.round((Math.random()-0.5)*100000)}));
    render();
  }
}

$("#btnSearch").addEventListener("click", ()=>{
  state.q = $("#q").value.trim() || "laptop";
  if($("#liveToggle").checked) fetchLive(state.q);
  else render();
});
$("#q").addEventListener("keydown", e=>{ if(e.key==="Enter") $("#btnSearch").click(); });
document.querySelectorAll(".chip").forEach(c=> c.addEventListener("click", ()=>{
  $("#q").value = c.dataset.q; state.q = c.dataset.q;
  if($("#liveToggle").checked) fetchLive(state.q); else render();
}));
document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  state.filter = t.dataset.filter;
  render();
}));
$("#sort").addEventListener("change", e=>{ state.sort = e.target.value; render(); });

render();
if(!USE_MOCK){
  fetchLive(state.q);
  const t = document.getElementById("liveToggle");
  if(t) t.checked = true;
}
