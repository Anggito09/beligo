// Copy file ini untuk marketplace baru: misal tiktok.js, blibli.js
// Implementasikan function scrape(query) -> Promise<Product[]>

export async function scrape(query) {
  // Contoh dengan fetch + cheerio (untuk halaman statis)
  // Untuk halaman dinamis gunakan playwright: await page.goto(`https://market.com/search?q=${query}`)
  // Selector wajib diupdate kalau marketplace ganti DOM
  const products = [];
  // TODO: isi logic scraping
  // products.push({ title, price, rating, sold, url, source: "MarketName" })
  return products;
}
