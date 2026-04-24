export type NumberArray = number[];

export function calculateEMA(data: NumberArray, period: number): NumberArray {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const ema: NumberArray = [];
  let sma = 0;
  for (let i = 0; i < period; i++) sma += data[i];
  ema.push(sma / period);
  for (let i = period; i < data.length; i++) {
    ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

export function calculateRSI(data: NumberArray, period: number = 14): NumberArray {
  if (data.length < period + 1) return [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  const rsi: NumberArray = [];
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    const rsNext = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rsNext));
  }
  return rsi;
}

export function calculateMACD(data: NumberArray, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const offset = slow - fast;
  const macdLine: NumberArray = [];
  for (let i = 0; i < emaSlow.length; i++) macdLine.push(emaFast[i + offset] - emaSlow[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histOffset = macdLine.length - signalLine.length;
  const histogram: NumberArray = [];
  for (let i = 0; i < signalLine.length; i++) histogram.push(macdLine[i + histOffset] - signalLine[i]);
  return { macdLine, signalLine, histogram };
}
