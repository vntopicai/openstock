import { db } from '../db';
import { stocks, ohlcvDaily } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getQuoteCache, setQuoteCache } from './redisService';

export const getHistoricalData = async (symbol: string, outputSize: 'compact' | 'full' = 'compact') => {
  const limit = outputSize === 'compact' ? 100 : 5000;
  const data = await db.select().from(ohlcvDaily)
    .where(eq(ohlcvDaily.symbol, symbol.toUpperCase()))
    .orderBy(desc(ohlcvDaily.date)).limit(limit);
  return data.reverse();
};

export const getLatestQuote = async (symbol: string) => {
  const upperSymbol = symbol.toUpperCase();
  const cached = await getQuoteCache(upperSymbol);
  if (cached) return cached;

  const lastCandle = await db.select().from(ohlcvDaily)
    .where(eq(ohlcvDaily.symbol, upperSymbol)).orderBy(desc(ohlcvDaily.date)).limit(1);
  if (lastCandle.length === 0) return null;

  const c = lastCandle[0];
  const quoteData = {
    symbol: upperSymbol, price: parseFloat(c.close), volume: c.volume,
    high: parseFloat(c.high), low: parseFloat(c.low), open: parseFloat(c.open),
    timestamp: c.date.getTime() / 1000
  };
  await setQuoteCache(upperSymbol, quoteData);
  return quoteData;
};

export const searchStocks = async (query: string) => {
  const term = `%${query.toUpperCase()}%`;
  const res = await db.execute(sql`
    SELECT symbol, name, "exchangeId" as exchange FROM stocks 
    WHERE UPPER(symbol) LIKE ${term} OR UPPER(name) LIKE ${term} LIMIT 10
  `);
  return res.rows;
};
