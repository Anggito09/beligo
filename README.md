# Beligo — Smart Price Comparison

Replika fitur Beligo dari `portfolio-anggito` (`beligo-enhancements.js:15`): Price Intelligence yang bandingkan harga dari Shopee, Tokopedia, Blibli, Lazada + ranking **termurah/termahal × rating tinggi/rendah** + Value Score.

Live (setelah publish): `https://Anggito09.github.io/beligo`

## Struktur
- `index.html` / `style.css` / `app.js` — Frontend statis (GitHub Pages ready). Mock data 12 produk, filter 4 kuadran, sort value/price/rating.
- `api/search.js` — Serverless function untuk Vercel (parallel scrape + cache 15 menit). Ganti `USE_MOCK=false` di `app.js` setelah deploy.
- `api/scrapers/` — 1 file per marketplace. Tambah market baru tinggal copy `_template.js`.

## Cara Publish ke GitHub (baru)

1. Buat repo baru di github.com → **New repository** → Name: `beligo` → Public → Create (jangan centang README).
2. Di lokal:
```powershell
cd C:\Users\DESKTOP-10036\Documents\beligo
git init
git add .
git commit -m "feat: initial beligo MVP - price comparison GitHub Pages ready"
git branch -M main
git remote add origin https://github.com/Anggito09/beligo.git
git push -u origin main
```
3. Aktifkan GitHub Pages: di repo `beligo` → Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: `main` / `root` → Save. Tunggu 1-2 menit → URL jadi `https://anggito09.github.io/beligo/`

## Up-to-Date (market baru harga bagus langsung tampil)

Arsitektur: `Frontend GitHub Pages` fetch ke `Backend Vercel` (`/api/search?q=laptop`) dengan TTL 15 menit + cron populer.

Deploy backend (opsional, untuk data live):
1. Import repo `beligo` ke Vercel → Deploy → dapat URL `https://beligo.vercel.app`
2. Set env `REDIS_URL` (Upstash) untuk cache persistent
3. Di `app.js` set `USE_MOCK = false` dan `fetch('/api/search...')` ganti ke `https://beligo.vercel.app/api/search...` lalu push lagi

Tambah marketplace: copy `api/scrapers/_template.js` → `api/scrapers/tiktok.js` → daftar di `api/scrapers/index.js`.

## Catatan
- Scraping butuh proxy & handle anti-bot. Untuk produksi pertimbangkan Shopee Affiliate API / SerpAPI sebagai fallback.
- GitHub Pages hanya statis, jadi live scrape wajib backend terpisah (Vercel/Cloudflare Workers).
