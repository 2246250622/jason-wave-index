// Jason Wave Index - 資料抓取

/**
 * 取得目前比特幣區塊高度
 */
async function fetchCurrentHeight() {
  try {
    const res = await fetch('https://mempool.space/api/blocks/tip/height');
    if (!res.ok) throw new Error('Height fetch failed');
    const height = await res.json();
    return Number(height);
  } catch (err) {
    console.error('取得區塊高度失敗:', err);
    return null;
  }
}

/**
 * 從 Binance 取得 BTCUSDT 日線資料
 * @param {number} limit 最多取多少根（最大 1000）
 */
async function fetchBinanceDaily(limit = 1000) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Binance fetch failed');
    const raw = await res.json();

    // Binance 回傳格式: [openTime, open, high, low, close, volume, ...]
    // 我們先轉成 { time: 時間戳, value: 收盤價 }
    // 注意：之後會再對應到區塊高度
    return raw.map(k => ({
      time: Math.floor(k[0] / 1000), // 轉成秒級時間戳
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      value: parseFloat(k[4])  // 先用收盤價
    }));
  } catch (err) {
    console.error('取得 Binance 資料失敗:', err);
    return [];
  }
}

/**
 * 取得即時價格（簡單輪詢）
 */
async function fetchCurrentPrice() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    if (!res.ok) throw new Error('Price fetch failed');
    const data = await res.json();
    return parseFloat(data.price);
  } catch (err) {
    console.error('取得即時價格失敗:', err);
    return null;
  }
}