// Jason Wave Index - 主程式（完整中英文 + 主題）

const I18N = {
  zh: {
    price: 'BTC 價格',
    jwi: 'Jason Wave Index',
    blockHeight: '區塊高度',
    daily: '日',
    weekly: '週',
    monthly: '月',
    log: '對數',
    linear: '線性',
    theme: '主題',
    phaseBull: '目前處於牛市階段',
    phaseBear: '目前處於熊市階段',
    live: 'LIVE',
    line: '折線',
    candle: 'K線',
    wave: '波浪著色',
  },
  en: {
    price: 'BTC Price',
    jwi: 'Jason Wave Index',
    blockHeight: 'Block Height',
    daily: 'D',
    weekly: 'W',
    monthly: 'M',
    log: 'Log',
    linear: 'Linear',
    theme: 'Theme',
    phaseBull: 'Currently in Bull Phase',
    phaseBear: 'Currently in Bear Phase',
    live: 'LIVE',
    line: 'Line',
    candle: 'Candles',
    wave: 'Wave Color',
  }
};

const state = {
  theme: localStorage.getItem('jwi-theme') || 'dark',
  lang: localStorage.getItem('jwi-lang') || 'zh',
  scale: 'log',
  style: 'wave',     // 預設用波浪著色
  bucket: 'D',       // 預設用日線
  currentHeight: 0,
  currentPrice: 0,
  priceData: []
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('jwi-theme', theme);
  document.body.className = 'theme-' + theme;

  // 同步更新圖表顏色
  const isDark = theme === 'dark';
  const textColor = isDark ? '#8b9cb3' : '#64748b';
  const gridColor = isDark ? '#1a2332' : '#e2e8f0';
  const borderColor = isDark ? '#1e2833' : '#e2e8f0';

  if (mainChart) {
    mainChart.applyOptions({
      layout: { textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor },
      timeScale: { borderColor }
    });
  }
  if (jwiChart) {
    jwiChart.applyOptions({
      layout: { textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      rightPriceScale: { borderColor },
      timeScale: { borderColor }
    });
  }
}

function applyLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('jwi-lang', lang);

  const dict = I18N[lang];

  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // 更新階段文字
  updatePhaseText();

  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
}

function updatePhaseText() {
  if (!state.currentHeight) return;
  const phase = getPhase(state.currentHeight);
  const text = phase === 'bull' ? I18N[state.lang].phaseBull : I18N[state.lang].phaseBear;
  const el = $('#phase-text');
  if (el) el.textContent = text;
}

function updateHeader(height, price) {
  if (!height || !price) return;

  state.currentHeight = height;
  state.currentPrice = price;

  const jwi = calcJWI(height);

  $('#price-value').textContent = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
  $('#jwi-value').textContent = jwi.toFixed(3);
  $('#height-value').textContent = height.toLocaleString();

  updatePhaseText();
}


/**
 * 把時間戳價格資料粗略對應到區塊高度
 */
function mapPriceToHeight(priceData, currentHeight) {
  if (!priceData || !priceData.length || !currentHeight) return [];

  const result = [];
  const lastIndex = priceData.length - 1;

  for (let i = 0; i < priceData.length; i++) {
    const daysAgo = lastIndex - i;
    const estimatedHeight = currentHeight - (daysAgo * 144);

    if (estimatedHeight > 0) {
      result.push({
        time: estimatedHeight,
        open: priceData[i].open,
        high: priceData[i].high,
        low: priceData[i].low,
        close: priceData[i].close,
        value: priceData[i].close
      });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * 把日線資料聚合成週或月
 */
function aggregateData(dailyData, bucket) {
  if (bucket === 'D' || !dailyData || !dailyData.length) return dailyData;

  const result = [];
  let group = [];
  const size = bucket === 'W' ? 7 : 30;

  for (let i = 0; i < dailyData.length; i++) {
    group.push(dailyData[i]);

    if (group.length === size || i === dailyData.length - 1) {
      const open = group[0].open;
      const close = group[group.length - 1].close;
      const high = Math.max(...group.map(d => d.high));
      const low = Math.min(...group.map(d => d.low));
      const time = group[group.length - 1].time;

      result.push({
        time,
        open,
        high,
        low,
        close,
        value: close
      });

      group = [];
    }
  }

  return result;
}

async function loadRealData() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.remove('hidden');

  console.log('開始載入真實資料...');

  try {
    const [height, dailyData, livePrice] = await Promise.all([
      fetchCurrentHeight(),
      fetchBinanceDaily(3200),
      fetchCurrentPrice()
    ]);

    console.log('目前區塊高度:', height);
    console.log('取得日線數量:', dailyData.length);
    console.log('即時價格:', livePrice);

    if (!height || dailyData.length === 0) {
      throw new Error('資料不完整');
    }

    const mappedData = mapPriceToHeight(dailyData, height);
    state.priceData = mappedData;

    const data = aggregateData(mappedData, state.bucket);
    updateCharts(data, state.scale, state.style);
    updateHeader(height, livePrice || dailyData[dailyData.length - 1].value);

    console.log('真實資料載入完成，共', data.length, '個點');
  } catch (err) {
    console.error('載入失敗:', err);
    const mockData = generateMockData(300000, 960000, 144);
    updateCharts(mockData, state.scale, state.style);
    const last = mockData[mockData.length - 1];
    updateHeader(last.time, last.value);
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}
  


async function loadRealData() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.remove('hidden');

  console.log('開始載入真實資料...');

  try {
    const [height, dailyData, livePrice] = await Promise.all([
      fetchCurrentHeight(),
      fetchBinanceDaily(3000),
      fetchCurrentPrice()
    ]);

    console.log('目前區塊高度:', height);
    console.log('取得日線數量:', dailyData.length);
    console.log('即時價格:', livePrice);

    if (!height || dailyData.length === 0) {
      throw new Error('資料不完整');
    }

    const mappedData = mapPriceToHeight(dailyData, height);
    state.priceData = mappedData;

    const data = aggregateData(mappedData, state.bucket);
    updateCharts(data, state.scale, state.style);
    updateHeader(height, livePrice || dailyData[dailyData.length - 1].value);

    console.log('真實資料載入完成，共', mappedData.length, '個點');
  } catch (err) {
    console.error('載入失敗:', err);
    // 失敗時用模擬資料
    const mockData = generateMockData(300000, 960000, 144);
    const data = aggregateData(mappedData, state.bucket);
    updateCharts(data, state.scale, state.style);
    const last = mockData[mockData.length - 1];
    updateHeader(last.time, last.value);
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

function refreshChart() {
  if (state.priceData.length > 0) {
    const data = aggregateData(state.priceData, state.bucket);
    updateCharts(data, state.scale, state.style);
    updateHeader(state.currentHeight, state.currentPrice);
  } else {
    loadRealData();
  }
}

function bindEvents() {
  $('#btn-lang')?.addEventListener('click', () => {
    const next = state.lang === 'zh' ? 'en' : 'zh';
    applyLanguage(next);
  });

  $('#btn-theme')?.addEventListener('click', () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  $$('[data-bucket]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bucket = btn.dataset.bucket;
      $$('[data-bucket]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshChart();
    });
  });

  $$('[data-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    state.style = btn.dataset.style;
    $$('[data-style]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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
  applyLanguage(state.lang);
  bindEvents();
  initCharts();

  await loadRealData();

// 每 2 秒更新即時價格與區塊高度
setInterval(async () => {
  try {
    const [height, price] = await Promise.all([
      fetchCurrentHeight(),
      fetchCurrentPrice()
    ]);

    if (height && price) {
      const oldPrice = state.currentPrice;
      updateHeader(height, price);

      // 價格變化時閃爍
      if (oldPrice && Math.abs(price - oldPrice) > 0.5) {
        const priceEl = document.getElementById('price-value');
        if (priceEl) {
          priceEl.style.transition = 'color 0.15s';
          priceEl.style.color = price > oldPrice ? '#4ade80' : '#f87171';
          setTimeout(() => {
            priceEl.style.color = '';
          }, 500);
        }
      }
    }
  } catch (err) {
    // 安靜失敗，避免一直噴錯
  }
}, 2000);
  console.log('Jason Wave Index 初始化完成');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}