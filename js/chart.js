// Jason Wave Index - 圖表邏輯

let mainChart = null;
let jwiChart = null;
let priceSeries = null;
let jwiSeries = null;
let futureSeries = null;

// 用來存放標記的 series / primitives
let halvingLines = [];
let bullBearSeries = null;


function initCharts() {
  const mainContainer = document.getElementById('main-chart');
  const jwiContainer = document.getElementById('jwi-chart');
  
  if (!mainContainer || !jwiContainer) {
    console.error('找不到圖表容器');
    return;
  }

  const commonOptions = {
  layout: {
    background: { color: 'transparent' },
    textColor: '#8b9cb3',
  },
  grid: {
    vertLines: { color: '#1a2332' },
    horzLines: { color: '#1a2332' },
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
    vertLine: { color: '#22d3ee', width: 1, style: LightweightCharts.LineStyle.Dashed },
    horzLine: { color: '#22d3ee', width: 1, style: LightweightCharts.LineStyle.Dashed },
  },
  rightPriceScale: {
    borderColor: '#1e2833',
  },
  timeScale: {
    borderColor: '#1e2833',
    timeVisible: false,
    secondsVisible: false,
    tickMarkFormatter: (time) => {
      if (typeof time === 'number') {
        return Math.round(time).toLocaleString();
      }
      return '';
    },
  },
  localization: {
    timeFormatter: (time) => {
      if (typeof time === 'number') {
        return Math.round(time).toLocaleString();
      }
      return '';
    },
  },
};

  mainChart = LightweightCharts.createChart(mainContainer, {
    ...commonOptions,
    width: mainContainer.clientWidth,
    height: Math.max(mainContainer.clientHeight, 400),
  });

  

  jwiChart = LightweightCharts.createChart(jwiContainer, {
    ...commonOptions,
    width: jwiContainer.clientWidth,
    height: Math.max(jwiContainer.clientHeight, 180),
  });

  // 同步時間軸
  mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (range) jwiChart.timeScale().setVisibleLogicalRange(range);
  });
  jwiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
    if (range) mainChart.timeScale().setVisibleLogicalRange(range);
  });


// 讓 Halving 標籤跟著時間軸移動
mainChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
  updateHalvingLabelsPosition();
});

mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
  updateHalvingLabelsPosition();
});

  window.addEventListener('resize', () => {
    if (mainChart) {
      mainChart.applyOptions({
        width: mainContainer.clientWidth,
        height: Math.max(mainContainer.clientHeight, 300)
      });
    }
    if (jwiChart) {
      jwiChart.applyOptions({
        width: jwiContainer.clientWidth,
        height: Math.max(jwiContainer.clientHeight, 150)
      });
    }
  });

  // Hover 資訊卡
const tooltip = document.getElementById('tooltip');

mainChart.subscribeCrosshairMove(param => {
  if (!param || !param.time || !param.seriesData) {
    tooltip.style.display = 'none';
    return;
  }

  const priceDataPoint = param.seriesData.get(priceSeries);
  if (!priceDataPoint) {
    tooltip.style.display = 'none';
    return;
  }

  const height = param.time;
  const price = priceDataPoint.close || priceDataPoint.value;
  const jwi = calcJWI(height);
  const phase = getPhase(height);

  document.getElementById('tip-height').textContent = height.toLocaleString();
  document.getElementById('tip-price').textContent = Number(price).toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  });
  document.getElementById('tip-jwi').textContent = jwi.toFixed(3);
  document.getElementById('tip-phase').textContent = phase === 'bull' ? 'Bull Phase / 牛市' : 'Bear Phase / 熊市';

  tooltip.style.display = 'block';
  tooltip.style.left = (param.point.x + 20) + 'px';
  tooltip.style.top = (param.point.y + 20) + 'px';
});
  console.log('Charts initialized successfully');
}

/**
 * 計算某個高度區間內的所有減半高度
 */
function getHalvingHeights(minHeight, maxHeight) {
  const halvings = [];
  let h = Math.ceil(minHeight / HALVING_INTERVAL) * HALVING_INTERVAL;
  while (h <= maxHeight + HALVING_INTERVAL) {
    halvings.push(h);
    h += HALVING_INTERVAL;
  }
  return halvings;
}

/**
 * 畫減半垂直線（主圖 + 副圖都畫）
 */
function drawHalvingLines(minHeight, maxHeight) {
  // 清除舊的線
  if (window.halvingLines) {
    window.halvingLines.forEach(line => {
      try {
        mainChart.removeSeries(line.main);
        jwiChart.removeSeries(line.jwi);
      } catch (e) {}
    });
  }
  window.halvingLines = [];

  const heights = [];
  let h = Math.ceil(minHeight / 210000) * 210000;
  while (h <= maxHeight) {
    heights.push(h);
    h += 210000;
  }

  // 畫垂直線
  heights.forEach(height => {
    const mainLine = mainChart.addLineSeries({
      color: 'rgba(34, 211, 238, 0.25)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    mainLine.setData([
      { time: height, value: 1 },
      { time: height, value: 1000000 }
    ]);

    const jwiLine = jwiChart.addLineSeries({
      color: 'rgba(34, 211, 238, 0.3)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    jwiLine.setData([
      { time: height, value: 0 },
      { time: height, value: 1 }
    ]);

    window.halvingLines.push({ main: mainLine, jwi: jwiLine });
  });

  // ===== 產生文字標籤（只做一次） =====
  const labelsContainer = document.getElementById('halving-labels');
  if (labelsContainer) {
    labelsContainer.innerHTML = '';

    setTimeout(() => {
      heights.forEach((height, index) => {
        const x = mainChart.timeScale().timeToCoordinate(height);
        if (x === null) return;

        const label = document.createElement('div');
        label.className = 'halving-label';
        label.textContent = `Halving #${index + 1}`;
        label.dataset.height = height;          // 關鍵！
        label.style.left = x + 'px';
        labelsContainer.appendChild(label);
      });

      // 產生完後立即更新一次位置
      updateHalvingLabelsPosition();
    }, 80);
  }
}

/**
 * 畫牛熊區間背景（用 area series 簡單模擬）
 * 之後可以再優化成更漂亮的著色
 */
function drawBullBearBackground(priceData) {
  if (!priceData || priceData.length < 2) return;

  // 清除舊的
  if (bullBearSeries) {
    try { jwiChart.removeSeries(bullBearSeries); } catch (e) {}
    bullBearSeries = null;
  }

  // 為了簡單，我們在副圖用不同顏色的 area 表示牛熊
  // 實際專案可以用 markers 或 custom primitive，這裡先用基礎方法
}

function updateCharts(priceData, scale = 'log', style = 'line') {
  if (!mainChart || !jwiChart || !priceData || priceData.length === 0) {
    console.warn('無法更新圖表');
    return;
  }

  // 清除舊的 series
  if (priceSeries) {
    try { mainChart.removeSeries(priceSeries); } catch(e) {}
    priceSeries = null;
  }
  if (jwiSeries) {
    try { jwiChart.removeSeries(jwiSeries); } catch(e) {}
    jwiSeries = null;
  }
  if (futureSeries) {
    try { jwiChart.removeSeries(futureSeries); } catch(e) {}
    futureSeries = null;
  }
  if (window.bullSeries) {
    try { jwiChart.removeSeries(window.bullSeries); } catch(e) {}
    window.bullSeries = null;
  }
  if (window.bearSeries) {
    try { jwiChart.removeSeries(window.bearSeries); } catch(e) {}
    window.bearSeries = null;
  }
  if (window.waveSegments) {
    window.waveSegments.forEach(s => {
      try { mainChart.removeSeries(s); } catch(e) {}
    });
    window.waveSegments = [];
  }
  // 在清除舊 series 的區塊加上
if (window.bgSeries) {
  window.bgSeries.forEach(s => {
    try { mainChart.removeSeries(s); } catch(e) {}
  });
  window.bgSeries = [];
}
// ===== 牛熊背景著色 =====
window.bgSeries = [];
let currentPhase = null;
let segmentStart = null;
let segmentPoints = [];

const pushBackground = (phase, points) => {
  if (points.length < 2) return;

  const color = phase === 'bull' 
    ? 'rgba(34, 211, 238, 0.08)' 
    : 'rgba(248, 113, 113, 0.08)';

  const series = mainChart.addAreaSeries({
    topColor: color,
    bottomColor: color,
    lineColor: 'transparent',
    lineWidth: 0,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });

  // 用很高的值讓它填滿整個可見區域
  series.setData(points.map(p => ({
    time: p.time,
    value: 10000000   // 足夠高，在對數座標下也能蓋住
  })));

  window.bgSeries.push(series);
};

priceData.forEach((d, i) => {
  const phase = getPhase(d.time);

  if (currentPhase === null) {
    currentPhase = phase;
    segmentStart = d;
    segmentPoints = [d];
  } else if (phase !== currentPhase) {
    // 階段轉換，結束上一段
    pushBackground(currentPhase, segmentPoints);
    currentPhase = phase;
    segmentPoints = [priceData[i-1], d]; // 接上一個點讓它連續
  } else {
    segmentPoints.push(d);
  }
});

// 最後一段
if (segmentPoints.length >= 2) {
  pushBackground(currentPhase, segmentPoints);
}

  // ===== 主圖 =====
  if (style === 'candle') {
    priceSeries = mainChart.addCandlestickSeries({
      upColor: '#22d3ee',
      downColor: '#f87171',
      borderUpColor: '#22d3ee',
      borderDownColor: '#f87171',
      wickUpColor: '#22d3ee',
      wickDownColor: '#f87171',
    });
    priceSeries.setData(priceData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    })));
  } else if (style === 'wave') {
    // 效能友善的彩虹著色
    window.waveSegments = [];
    const maxSegments = 80;
    const segmentSize = Math.max(1, Math.floor(priceData.length / maxSegments));

    for (let i = 0; i < priceData.length - 1; i += segmentSize) {
      const end = Math.min(i + segmentSize, priceData.length - 1);
      const slice = priceData.slice(i, end + 1);

      const mid = slice[Math.floor(slice.length / 2)];
      const jwi = calcJWI(mid.time);
      const color = jwiToColor(jwi);

      const seg = mainChart.addLineSeries({
        color: color,
        lineWidth: 2.5,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });

      seg.setData(slice.map(d => ({
        time: d.time,
        value: d.close || d.value
      })));

      window.waveSegments.push(seg);
    }
  } else {
    // 一般折線
    priceSeries = mainChart.addLineSeries({
      color: '#22d3ee',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    });
    priceSeries.setData(priceData.map(d => ({
      time: d.time,
      value: d.close || d.value
    })));
  }

  // 對數 / 線性
  mainChart.priceScale('right').applyOptions({
    mode: scale === 'log'
      ? LightweightCharts.PriceScaleMode.Logarithmic
      : LightweightCharts.PriceScaleMode.Normal,
  });

  // ===== 副圖 JWI 牛熊分色 =====
  const bullData = [];
  const bearData = [];

  priceData.forEach((d, i) => {
    const jwi = +calcJWI(d.time).toFixed(4);
    const phase = getPhase(d.time);
    const point = { time: d.time, value: jwi };

    if (phase === 'bull') {
      bullData.push(point);
      if (i > 0 && getPhase(priceData[i - 1].time) === 'bear') {
        bearData.push(point);
      }
    } else {
      bearData.push(point);
      if (i > 0 && getPhase(priceData[i - 1].time) === 'bull') {
        bullData.push(point);
      }
    }
  });

  window.bullSeries = jwiChart.addLineSeries({
    color: '#22d3ee',
    lineWidth: 2.5,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  window.bullSeries.setData(bullData);

  window.bearSeries = jwiChart.addLineSeries({
    color: '#f87171',
    lineWidth: 2.5,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  window.bearSeries.setData(bearData);

  jwiSeries = jwiChart.addLineSeries({
    color: 'transparent',
    lineWidth: 0,
  });
  jwiSeries.setData(priceData.map(d => ({
    time: d.time,
    value: +calcJWI(d.time).toFixed(4)
  })));

  // ===== 未來推演 =====
  const lastHeight = priceData[priceData.length - 1].time;
  const futureData = generateFutureJWI(lastHeight, 80000, 400);  // 縮短未來推演

  futureSeries = jwiChart.addLineSeries({
    color: 'rgba(34, 211, 238, 0.4)',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  futureSeries.setData(futureData);

  // ===== 減半線 =====
  drawHalvingLines(priceData[0].time, lastHeight + 150000);

  mainChart.timeScale().fitContent();
  console.log('Charts updated – style:', style);
}

/**
 * JWI (0~1) → 彩虹顏色（回傳 hex）
 */
function jwiToColor(jwi) {
  // 0 = 藍 (210°), 1 = 紅 (0°)
  const hue = 210 - (jwi * 210);
  return hslToHex(hue, 80, 55);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function generateMockData(startHeight = 300000, endHeight = 960000, step = 144) {
  const data = [];
  let price = 100;

  for (let h = startHeight; h <= endHeight; h += step) {
    const jwi = calcJWI(h);
    const drift = (jwi - 0.5) * 0.012;
    const noise = (Math.random() - 0.5) * 0.04;
    price = Math.max(price * (1 + drift + noise), 10);

    data.push({
      time: h,
      value: Math.round(price)
    });
  }
  return data;
}

function updateHalvingLabelsPosition() {
  const labelsContainer = document.getElementById('halving-labels');
  if (!labelsContainer || !mainChart) return;

  const labels = labelsContainer.querySelectorAll('.halving-label');
  labels.forEach(label => {
    const height = Number(label.dataset.height);
    if (!height) return;

    const x = mainChart.timeScale().timeToCoordinate(height);
    if (x === null) {
      label.style.display = 'none';
    } else {
      label.style.display = 'block';
      label.style.left = x + 'px';
    }
  });
}