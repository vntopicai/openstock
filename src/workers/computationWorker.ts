import { db } from '../db';
import { stocks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { computeTechnicalAnalysis } from '../services/techAnalysisService';
import { connectRedis } from '../services/redisService';

export async function runComputationJob() {
  console.log('[Worker] Computing technicals...');
  const list = await db.select({ symbol: stocks.symbol }).from(stocks).where(eq(stocks.isActive, true));
  for (let i = 0; i < list.length; i += 10) {
    await Promise.allSettled(list.slice(i, i + 10).map(s => computeTechnicalAnalysis(s.symbol, '1d')));
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('[Worker] Done.');
}

export async function initWorker() {
  await connectRedis();
  await runComputationJob();
  Bun.cron('*/5 9-14 * * 1-5', () => runComputationJob().catch(console.error));
  console.log('[Worker] Scheduled: 9:00-14:59 Mon-Fri');
}
