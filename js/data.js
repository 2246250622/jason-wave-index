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
/**
 * 從 Binance 取得更長的 BTCUSDT 日線
 * 透過多次請求往前抓
 */
async function fetchBinanceDaily(targetCount = 3200) {
  try {
    let allData = [];
    let endTime = Date.now();
    const batchSize = 1000;
    let safety = 0;

    while (allData.length < targetCount && safety < 6) {
      safety++;
      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${batchSize}&endTime=${endTime}`;
      const res = await fetch(url);
      if (!res.ok) break;

      const raw = await res.json();
      if (!raw || raw.length === 0) break;

      const batch = raw.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        value: parseFloat(k[4])
      }));

      // 接在前面
      allData = batch.concat(allData);
      endTime = raw[0][0] - 1;

      // 避免打太快
      await new Promise(r => setTimeout(r, 300));

      if (raw.length < batchSize) break;
    }

    // 去重 + 排序
    const map = new Map();
    allData.forEach(d => map.set(d.time, d));
    const unique = Array.from(map.values()).sort((a, b) => a.time - b.time);

    console.log('最終取得日線數量:', unique.length);
    return unique;
  } catch (err) {
    console.error('取得較長歷史失敗:', err);
    // 失敗就退回只抓 1000 根
    return fetchBinanceDailySimple(1000);
  }
}

// 備用的簡單版本
async function fetchBinanceDailySimple(limit = 1000) {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`;
  const res = await fetch(url);
  const raw = await res.json();
  return raw.map(k => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    value: parseFloat(k[4])
  }));
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