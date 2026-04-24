import { db } from '../db';
import { fundamentalsQuarterly, valuationHistory, ohlcvDaily } from '../db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';

export async function getFundamentalOverview(symbol: string) {
  const quarters = await db.select().from(fundamentalsQuarterly)
    .where(eq(fundamentalsQuarterly.symbol, symbol.toUpperCase())).orderBy(desc(fundamentalsQuarterly.reportDate)).limit(4);
  if (quarters.length === 0) return null;

  const latest = quarters[0];
  const ttmEps = quarters.reduce((s, q) => s + parseFloat(q.eps || '0'), 0);
  const ttmRevenue = quarters.reduce((s, q) => s + parseFloat(q.revenue || '0'), 0);
  const ttmNetIncome = quarters.reduce((s, q) => s + parseFloat(q.netIncome || '0'), 0);

  const lastPrice = await db.select({ close: ohlcvDaily.close }).from(ohlcvDaily)
    .where(eq(ohlcvDaily.symbol, symbol.toUpperCase())).orderBy(desc(ohlcvDaily.date)).limit(1);
  const price = lastPrice.length ? parseFloat(lastPrice[0].close) : 0;
  const bvps = parseFloat(latest.bvps || '0');
  const shares = latest.sharesOutstanding || 0;

  return {
    symbol: symbol.toUpperCase(), currentPrice: price, marketCap: price * shares,
    peRatio: ttmEps > 0 ? price / ttmEps : null, pbRatio: bvps > 0 ? price / bvps : null,
    epsTTM: ttmEps, bvps, roe: parseFloat(latest.roe || '0'), roa: parseFloat(latest.roa || '0'),
    debtToEquity: parseFloat(latest.debtToEquity || '0'), revenueTTM: ttmRevenue, netIncomeTTM: ttmNetIncome,
    lastReportDate: latest.reportDate, sharesOutstanding: shares
  };
}

export async function getValuationHistory(symbol: string, days = 365) {
  const start = new Date(); start.setDate(start.getDate() - days);
  return db.select().from(valuationHistory)
    .where(and(eq(valuationHistory.symbol, symbol.toUpperCase()), gte(valuationHistory.date, start)))
    .orderBy(valuationHistory.date);
}

export async function calculateDailyValuation(symbol: string, date: Date, price: number) {
  const quarters = await db.select().from(fundamentalsQuarterly)
    .where(eq(fundamentalsQuarterly.symbol, symbol.toUpperCase())).orderBy(desc(fundamentalsQuarterly.reportDate)).limit(4);
  if (quarters.length === 0) return;

  const ttmEps = quarters.reduce((s, q) => s + parseFloat(q.eps || '0'), 0);
  const bvps = parseFloat(quarters[0].bvps || '0');
  const shares = quarters[0].sharesOutstanding || 0;
  const pe = ttmEps > 0 ? price / ttmEps : null;
  const pb = bvps > 0 ? price / bvps : null;

  await db.insert(valuationHistory).values({
    symbol: symbol.toUpperCase(), date, pe: pe?.toString(), pb: pb?.toString(),
    epsTTM: ttmEps.toString(), marketCap: price * shares
  }).onConflictDoUpdate({
    target: [valuationHistory.symbol, valuationHistory.date],
    set: { pe: pe?.toString(), pb: pb?.toString(), epsTTM: ttmEps.toString(), marketCap: price * shares }
  });
}
