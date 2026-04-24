import { db } from '../db';
import { ohlcvDaily, latestIndicators, signals } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { calculateEMA, calculateRSI, calculateMACD } from '../utils/indicators';
import { redis } from './redisService';

export async function computeTechnicalAnalysis(symbol: string, timeframe: string = '1d') {
  const candles = await db.select({ close: ohlcvDaily.close, date: ohlcvDaily.date })
    .from(ohlcvDaily).where(eq(ohlcvDaily.symbol, symbol)).orderBy(desc(ohlcvDaily.date)).limit(100);
  if (candles.length < 60) return null;

  const closes = candles.reverse().map(c => parseFloat(c.close));
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  const latest = {
    rsi14: rsi[rsi.length - 1].toString(),
    ema20: ema20[ema20.length - 1].toString(),
    ema50: ema50[ema50.length - 1].toString(),
    macdLine: macd.macdLine[macd.macdLine.length - 1].toString(),
    macdSignal: macd.signalLine[macd.signalLine.length - 1].toString(),
    macdHist: macd.histogram[macd.histogram.length - 1].toString(),
  };

  let score = 50; const reasons: string[] = [];
  if (parseFloat(latest.ema20) > parseFloat(latest.ema50)) { score += 20; reasons.push('EMA20 > EMA50'); }
  else { score -= 20; reasons.push('EMA20 < EMA50'); }
  if (parseFloat(latest.rsi14) < 30) { score += 15; reasons.push('RSI Oversold'); }
  else if (parseFloat(latest.rsi14) > 70) { score -= 15; reasons.push('RSI Overbought'); }
  if (parseFloat(latest.macdLine) > parseFloat(latest.macdSignal)) { score += 15; reasons.push('MACD Bullish'); }
  else { score -= 15; reasons.push('MACD Bearish'); }

  score = Math.max(0, Math.min(100, score));
  const type = score >= 70 ? 'BUY' : score <= 30 ? 'SELL' : 'HOLD';
  const strength = score >= 80 || score <= 20 ? 'STRONG' : score >= 60 || score <= 40 ? 'MEDIUM' : 'WEAK';
  const signalData = { symbol, timeframe, type, strength, score, reasons, triggeredAt: new Date() };

  await db.insert(latestIndicators).values({ symbol, timeframe, ...latest, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [latestIndicators.symbol], set: { ...latest, updatedAt: new Date() } });

  if (type !== 'HOLD') {
    await db.insert(signals).values(signalData);
    await redis.publish(`signals:${symbol}`, JSON.stringify(signalData));
  }
  return { symbol, indicators: latest, signal: signalData };
}

export const getLatestIndicators = (symbol: string) => db.select().from(latestIndicators).where(eq(latestIndicators.symbol, symbol)).limit(1);
export const getRecentSignals = (symbol: string, limit = 5) => db.select().from(signals).where(eq(signals.symbol, symbol)).orderBy(desc(signals.triggeredAt)).limit(limit);
