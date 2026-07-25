// Jason Wave Index - 核心公式

const HALVING_INTERVAL = 210000;
const BULL_BLOCKS = 157500;
const BEAR_BLOCKS = 52500;
const HALVING_OFFSET = 78750;

function calcJWI(height) {
  const s = (height + HALVING_OFFSET) % HALVING_INTERVAL;
  if (s < BULL_BLOCKS) {
    return s / BULL_BLOCKS;
  } else {
    return 1 - (s - BULL_BLOCKS) / BEAR_BLOCKS;
  }
}

function getPhase(height) {
  const s = (height + HALVING_OFFSET) % HALVING_INTERVAL;
  return s < BULL_BLOCKS ? 'bull' : 'bear';
}

function generateFutureJWI(currentHeight, futureBlocks = 120000, step = 300) {
  const points = [];
  for (let h = currentHeight; h <= currentHeight + futureBlocks; h += step) {
    points.push({
      time: h,
      value: calcJWI(h)
    });
  }
  return points;
}