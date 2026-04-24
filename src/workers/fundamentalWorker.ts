import { db } from '../db';
import { stocks, ohlcvDaily } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { calculateDailyValuation } from '../services/fundamentalService';
import { scanVolumeSpike, scanBreakout } from '../services/advancedSignalService';
import { connectRedis } from '../services/redisService';

async function runValuation() {
  console.log('[FundWorker] Valuation...');
  const list = await db.select({ symbol: stocks.symbol }).from(stocks).where(eq(stocks.isActive, true));
  const today = new Date(); today.setUTCHours(0,0,0,0);
  for (const { symbol } of list) {
    const c = await db.select({ close: ohlcvDaily.close }).from(ohlcvDaily).where(eq(ohlcvDaily.symbol, symbol)).orderBy(desc(ohlcvDaily.date)).limit(1);
    if (c.length) await calculateDailyValuation(symbol, today, parseFloat(c[0].close));
  }
}

async function runScanner() {
  console.log('[FundWorker] Scanning...');
  const list = await db.select({ symbol: stocks.symbol }).from(stocks).where(eq(stocks.isActive, true));
  for (const { symbol } of list) { await scanVolumeSpike(symbol); await scanBreakout(symbol); }
}

export async function initFundamentalWorker() {
  await connectRedis();
  await runValuation(); await runScanner();
  Bun.cron('30 15 * * 1-5', () => runValuation().catch(console.error));
  Bun.cron('45 14 * * 1-5', () => runScanner().catch(console.error));
  console.log('[FundWorker] Scheduled');
}
