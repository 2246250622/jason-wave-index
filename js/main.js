// Jason Wave Index - 主程式

const state = {
  theme: localStorage.getItem('jwi-theme') || 'dark',
  lang: localStorage.getItem('jwi-lang') || 'zh',
  scale: 'log',
  bucket: 'D',
  currentHeight: 0,
  currentPrice: 0,
  priceData: []       // 儲存處理後的資料
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('jwi-theme', theme);
  document.body.className = 'theme-' + theme;
}

function updateHeader(height, price) {
  if (!height || !price) return;

  const jwi = calcJWI(height);
  const phase = getPhase(height);

  $('#price-value').textContent = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
  $('#jwi-value').textContent = jwi.toFixed(3);
  $('#height-value').textContent = height.toLocaleString();

  const phaseText = phase === 'bull'
    ? (state.lang === 'zh' ? '目前處於牛市階段' : 'Currently in Bull Phase')
    : (state.lang === 'zh' ? '目前處於熊市階段' : 'Currently in Bear Phase');

  $('#phase-text').textContent = phaseText;
}

/**
 * 把「時間戳價格」粗略對應到區塊高度
 * （暫時用平均出塊時間估算，之後可再優化）
 */
function mapPriceToHeight(priceData, currentHeight) {
  if (!priceData.length || !currentHeight) return [];

  // 假設最近一根對應目前高度，往前推
  // 平均每 10 分鐘一個塊 → 一天約 144 塊
  const result = [];
  const lastIndex = priceData.length - 1;

  for (let i = 0; i < priceData.length; i++) {
    const daysAgo = lastIndex - i;
    const estimatedHeight = currentHeight - (daysAgo * 144);

    if (estimatedHeight > 0) {
      result.push({
        time: estimatedHeight,
        value: priceData[i].value
      });
    }
  }

  // 確保按高度排序
  return result.sort((a, b) => a.time - b.time);
}

async function loadRealData() {
  console.log('開始載入真實資料...');

  // 同時抓高度與價格
  const [height, dailyData, livePrice] = await Promise.all([
    fetchCurrentHeight(),
    fetchBinanceDaily(1000),
    fetchCurrentPrice()
  ]);

  console.log('目前區塊高度:', height);
  console.log('取得日線數量:', dailyData.length);
  console.log('即時價格:', livePrice);

  if (!height || dailyData.length === 0) {
    console.warn('真實資料載入失敗，改用模擬資料');
    const mockData = generateMockData(300000, 960000, 144);
    updateCharts(mockData, state.scale);
    const last = mockData[mockData.length - 1];
    updateHeader(last.time, last.value);
    return;
  }

  state.currentHeight = height;
  state.currentPrice = livePrice || dailyData[dailyData.length - 1].value;

  // 把價格對應到區塊高度
  const mappedData = mapPriceToHeight(dailyData, height);
  state.priceData = mappedData;

  updateCharts(mappedData, state.scale);
  updateHeader(height, state.currentPrice);

  console.log('真實資料載入完成，共', mappedData.length, '個點');
}

function refreshChart() {
  if (state.priceData.length > 0) {
    // 已有真實資料就直接重繪
    updateCharts(state.priceData, state.scale);
    updateHeader(state.currentHeight, state.currentPrice);
  } else {
    // 還沒載入就重新載入
    loadRealData();
  }
}

function bindEvents() {
  $('#btn-lang')?.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('jwi-lang', state.lang);
    updateHeader(state.currentHeight, state.currentPrice);
  });

  $('#btn-theme')?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  $$('[data-bucket]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bucket = btn.dataset.bucket;
      $$('[data-bucket]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 之後實作不同粒度
      refreshChart();
    });
  });

  $$('[data-scale]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.scale = btn.dataset.scale;
      $$('[data-scale]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshChart();
    });
  });
}

async function init() {
  console.log('開始初始化 Jason Wave Index...');
  applyTheme(state.theme);
  bindEvents();
  initCharts();

  // 載入真實資料
  await loadRealData();

  // 每 60 秒更新一次高度與價格
  setInterval(async () => {
    const [height, price] = await Promise.all([
      fetchCurrentHeight(),
      fetchCurrentPrice()
    ]);
    if (height) state.currentHeight = height;
    if (price) state.currentPrice = price;
    updateHeader(state.currentHeight, state.currentPrice);
  }, 60000);

  console.log('Jason Wave Index 初始化完成');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}