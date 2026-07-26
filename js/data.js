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
async function fetchBinanceDaily(totalLimit = 3000) {
  try {
    let allData = [];
    let endTime = Date.now(); // 從現在往前抓
    const batchSize = 1000;

    while (allData.length < totalLimit) {
      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${batchSize}&endTime=${endTime}`;
      const res = await fetch(url);
      if (!res.ok) break;

      const raw = await res.json();
      if (!raw.length) break;

      const batch = raw.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        value: parseFloat(k[4])
      }));

      allData = batch.concat(allData); // 往前的資料接在前面
      endTime = raw[0][0] - 1; // 下一輪的結束時間設為這批最早的前一毫秒

      // 避免請求太快
      await new Promise(r => setTimeout(r, 200));

      if (raw.length < batchSize) break; // 已經抓到底了
    }

    // 去重並排序
    const unique = [];
    const seen = new Set();
    for (const d of allData) {
      if (!seen.has(d.time)) {
        seen.add(d.time);
        unique.push(d);
      }
    }
    unique.sort((a, b) => a.time - b.time);

    console.log('總共取得日線數量:', unique.length);
    return unique;
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