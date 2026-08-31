# Beligo — Smart Price Comparison

Platform pembanding harga multi-marketplace untuk membantu pembeli menemukan opsi terbaik berdasarkan harga dan rating.

**Live:** https://anggito09.github.io/beligo

## Fitur
- Pencarian produk lintas marketplace (Shopee, Tokopedia, Blibli, Lazada)
- Pengelompokan: termurah & termahal dengan rating tinggi/rendah
- Value score untuk rekomendasi paling seimbang
- Filter dan sorting real-time

## Tech Stack
- Frontend: HTML, CSS, JavaScript (GitHub Pages)
- Backend: Vercel Serverless Function (`/api/search`) dengan cache 15 menit
- Scraper modular di `api/scrapers/` — tambah marketplace cukup duplikasi template

## Deploy
- Frontend otomatis via GitHub Pages (branch `main`)
- Backend deploy ke Vercel: import repository → deploy

