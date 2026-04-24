import { db } from '../db';
import { ohlcvDaily, advancedSignals } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { redis } from './redisService';

export async function scanVolumeSpike(symbol: string, threshold = 2.5) {
  const candles = await db.select().from(ohlcvDaily).where(eq(ohlcvDaily.symbol, symbol)).orderBy(desc(ohlcvDaily.date)).limit(21);
  if (candles.length < 21) return null;
  const current = candles[0], prev20 = candles.slice(1);
  const avgVol = prev20.reduce((s, c) => s + Number(c.volume), 0) / 20;
  const ratio = avgVol > 0 ? Number(current.volume) / avgVol : 0;
  if (ratio >= threshold) {
    const sig = { symbol, type: 'VOLUME_SPIKE', timeframe: '1d', score: Math.min(100, Math.round(ratio * 30)), metadata: { spikeRatio: ratio.toFixed(2), avgVol20: Math.round(avgVol) }, triggeredAt: new Date() };
    await db.insert(advancedSignals).values(sig);
    await redis.publish(`signals:${symbol}`, JSON.stringify({ ...sig, category: 'advanced' }));
    return sig;
  }
  return null;
}

export async function scanBreakout(symbol: string, lookback = 20) {
  const candles = await db.select().from(ohlcvDaily).where(eq(ohlcvDaily.symbol, symbol)).orderBy(desc(ohlcvDaily.date)).limit(lookback + 1);
  if (candles.length < lookback + 1) return null;
  const current = candles[0], prev = candles.slice(1);
  const resistance = Math.max(...prev.map(c => parseFloat(c.high)));
  const avgVol = prev.reduce((s, c) => s + Number(c.volume), 0) / lookback;
  if (parseFloat(current.close) > resistance && Number(current.volume) > avgVol * 1.2) {
    const sig = { symbol, type: 'BREAKOUT', timeframe: '1d', score: 85, metadata: { resistance, volRatio: (Number(current.volume)/avgVol).toFixed(2) }, triggeredAt: new Date() };
    await db.insert(advancedSignals).values(sig);
    await redis.publish(`signals:${symbol}`, JSON.stringify({ ...sig, category: 'advanced' }));
    return sig;
  }
  return null;
}
