// Jason Wave Index - 圖表邏輯

let mainChart = null;
let jwiChart = null;
let priceSeries = null;
let jwiSeries = null;
let futureSeries = null;

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

  // 響應式
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

function updateCharts(priceData, scale = 'log') {
  if (!mainChart || !jwiChart || !priceData || priceData.length === 0) {
    console.warn('無法更新圖表', { mainChart: !!mainChart, dataLength: priceData?.length });
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

  // 主圖價格
  priceSeries = mainChart.addLineSeries({
    color: '#22d3ee',
    lineWidth: 2,
    priceFormat: { type: 'price', precision: 0, minMove: 1 },
  });
  priceSeries.setData(priceData);

  // 對數 / 線性
  mainChart.priceScale('right').applyOptions({
    mode: scale === 'log'
      ? LightweightCharts.PriceScaleMode.Logarithmic
      : LightweightCharts.PriceScaleMode.Normal,
  });

  // 副圖 JWI
  const jwiData = priceData.map(d => ({
    time: d.time,
    value: +calcJWI(d.time).toFixed(4)
  }));

  jwiSeries = jwiChart.addLineSeries({
    color: '#22d3ee',
    lineWidth: 2,
    priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
  });
  jwiSeries.setData(jwiData);

  // 未來推演
  const lastHeight = priceData[priceData.length - 1].time;
  const futureData = generateFutureJWI(lastHeight);

  futureSeries = jwiChart.addLineSeries({
    color: 'rgba(34, 211, 238, 0.45)',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    lastValueVisible: false,
    priceLineVisible: false,
  });
  futureSeries.setData(futureData);

  mainChart.timeScale().fitContent();
  console.log('Charts updated with', priceData.length, 'points');
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