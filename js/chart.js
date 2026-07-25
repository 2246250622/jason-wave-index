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
  // 先清除舊的
  halvingLines.forEach(line => {
    try {
      mainChart.removeSeries(line.main);
      jwiChart.removeSeries(line.jwi);
    } catch (e) {}
  });
  halvingLines = [];

  const heights = getHalvingHeights(minHeight, maxHeight);

  heights.forEach(h => {
    // 主圖減半線
    const mainLine = mainChart.addLineSeries({
      color: 'rgba(34, 211, 238, 0.35)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    // 用兩點畫垂直線
    mainLine.setData([
      { time: h, value: 0 },
      { time: h, value: 1000000 }  // 足夠高的值
    ]);

    // 副圖減半線
    const jwiLine = jwiChart.addLineSeries({
      color: 'rgba(34, 211, 238, 0.35)',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    jwiLine.setData([
      { time: h, value: 0 },
      { time: h, value: 1 }
    ]);

    halvingLines.push({ main: mainLine, jwi: jwiLine, height: h });
  });
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

  // 清除舊 series
  if (priceSeries) {
    mainChart.removeSeries(priceSeries);
    priceSeries = null;
  }
  if (jwiSeries) {
    jwiChart.removeSeries(jwiSeries);
    jwiSeries = null;
  }
  if (futureSeries) {
    jwiChart.removeSeries(futureSeries);
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
  } else {
    // line 或 wave 都先用線
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

  mainChart.priceScale('right').applyOptions({
    mode: scale === 'log'
      ? LightweightCharts.PriceScaleMode.Logarithmic
      : LightweightCharts.PriceScaleMode.Normal,
  });

  // ===== 副圖 JWI 牛熊分色（保持原本邏輯） =====
  const bullData = [];
  const bearData = [];

  priceData.forEach((d, i) => {
    const jwi = +calcJWI(d.time).toFixed(4);
    const phase = getPhase(d.time);
    const point = { time: d.time, value: jwi };

    if (phase === 'bull') {
      bullData.push(point);
      if (i > 0 && getPhase(priceData[i-1].time) === 'bear') {
        bearData.push(point);
      }
    } else {
      bearData.push(point);
      if (i > 0 && getPhase(priceData[i-1].time) === 'bull') {
        bullData.push(point);
      }
    }
  });

  window.bullSeries = jwiChart.addLineSeries({
    color: '#22d3ee',
    lineWidth: 2.5,
    priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
    lastValueVisible: false,
    priceLineVisible: false,
  });
  window.bullSeries.setData(bullData);

  window.bearSeries = jwiChart.addLineSeries({
    color: '#f87171',
    lineWidth: 2.5,
    priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
    lastValueVisible: false,
    priceLineVisible: false,
  });
  window.bearSeries.setData(bearData);

  jwiSeries = jwiChart.addLineSeries({
    color: 'transparent',
    lineWidth: 0,
    priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
  });
  jwiSeries.setData(priceData.map(d => ({
    time: d.time,
    value: +calcJWI(d.time).toFixed(4)
  })));

  // ===== 未來推演 =====
  const lastHeight = priceData[priceData.length - 1].time;
  const futureData = generateFutureJWI(lastHeight);

  futureSeries = jwiChart.addLineSeries({
    color: 'rgba(34, 211, 238, 0.4)',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  futureSeries.setData(futureData);

  // ===== 減半線 =====
  const minH = priceData[0].time;
  const maxH = lastHeight + 150000;
  drawHalvingLines(minH, maxH);

  mainChart.timeScale().fitContent();
  console.log('Charts updated – style:', style);
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