// Jason Wave Index - 設定檔

export const CONFIG = {
  // 週期常數
  HALVING_INTERVAL: 210000,
  BULL_BLOCKS: 157500,
  BEAR_BLOCKS: 52500,
  HALVING_OFFSET: 78750,

  // 分桶大小（區塊數）
  BUCKETS: {
    D: 144,      // 約 1 天
    W: 1008,     // 約 1 週
    M: 4320      // 約 1 個月
  },

  // 預設設定
  defaultTheme: 'dark',
  defaultLang: 'zh',
  defaultScale: 'log',
  defaultStyle: 'wave',   // wave | candle | line
  defaultBucket: 'D'
};

// 主題色（深色 + 青色/藍色強調）
export const THEMES = {
  dark: {
    bg: '#0b0f14',
    card: '#12181f',
    border: '#1e2833',
    text: '#e6edf3',
    textMuted: '#8b9cb3',
    accent: '#22d3ee',        // cyan
    accentHover: '#67e8f9',
    bull: 'rgba(34, 211, 238, 0.15)',
    bear: 'rgba(239, 68, 68, 0.12)',
    grid: '#1a2332',
    crosshair: '#22d3ee'
  },
  light: {
    bg: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    accent: '#0891b2',
    accentHover: '#0e7490',
    bull: 'rgba(8, 145, 178, 0.12)',
    bear: 'rgba(239, 68, 68, 0.08)',
    grid: '#e2e8f0',
    crosshair: '#0891b2'
  }
};

// 中英文文案
export const I18N = {
  zh: {
    title: 'Jason Wave Index',
    subtitle: '以區塊高度為唯一橫軸的比特幣週期指數',
    price: 'BTC 價格',
    jwi: 'Jason Wave Index',
    blockHeight: '區塊高度',
    phaseBull: '牛市階段',
    phaseBear: '熊市階段',
    halving: '減半',
    future: '未來推演',
    daily: '日',
    weekly: '週',
    monthly: '月',
    log: '對數',
    linear: '線性',
    wave: '波浪著色',
    candle: 'K線',
    line: '折線',
    theme: '主題',
    language: '語言',
    about: '關於指標',
    live: '即時'
  },
  en: {
    title: 'Jason Wave Index',
    subtitle: 'Bitcoin cycle index with block height as the only x-axis',
    price: 'BTC Price',
    jwi: 'Jason Wave Index',
    blockHeight: 'Block Height',
    phaseBull: 'Bull Phase',
    phaseBear: 'Bear Phase',
    halving: 'Halving',
    future: 'Future Projection',
    daily: 'D',
    weekly: 'W',
    monthly: 'M',
    log: 'Log',
    linear: 'Linear',
    wave: 'Wave Color',
    candle: 'Candles',
    line: 'Line',
    theme: 'Theme',
    language: 'Language',
    about: 'About',
    live: 'Live'
  }
};