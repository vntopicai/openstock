import { pgTable, varchar, timestamp, numeric, bigint, boolean, jsonb, primaryKey, serial, integer, index, uniqueIndex, text } from 'drizzle-orm/pg-core';

export const exchanges = pgTable('exchanges', {
  id: varchar('id', { length: 10 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Ho_Chi_Minh'),
});

export const stocks = pgTable('stocks', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  exchangeId: varchar('exchange_id', { length: 10 }).references(() => exchanges.id),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 50 }),
  industry: varchar('industry', { length: 50 }),
  aliases: jsonb('aliases').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const ohlcvDaily = pgTable('ohlcv_daily', {
  symbol: varchar('symbol', { length: 10 }).notNull(),
  date: timestamp('date').notNull(),
  open: numeric('open', { precision: 18, scale: 4 }).notNull(),
  high: numeric('high', { precision: 18, scale: 4 }).notNull(),
  low: numeric('low', { precision: 18, scale: 4 }).notNull(),
  close: numeric('close', { precision: 18, scale: 4 }).notNull(),
  volume: bigint('volume', { mode: 'number' }).notNull(),
  adjustedClose: numeric('adjusted_close', { precision: 18, scale: 4 }),
}, (t) => ({ pk: primaryKey({ columns: [t.symbol, t.date] }) }));

export const stockPrices = pgTable('stock_prices', {
  symbol: varchar('symbol', { length: 10 }).notNull(),
  interval: varchar('interval', { length: 5 }).notNull(), // 1m,5m,15m,30m,60m,1d,1w,1mo
  time: timestamp('time').notNull(), // UTC
  open: numeric('open', { precision: 18, scale: 4 }).notNull(),
  high: numeric('high', { precision: 18, scale: 4 }).notNull(),
  low: numeric('low', { precision: 18, scale: 4 }).notNull(),
  close: numeric('close', { precision: 18, scale: 4 }).notNull(),
  volume: bigint('volume', { mode: 'number' }).notNull(),
  source: varchar('source', { length: 20 }).default('internal'),
  splitCoefficient: numeric('split_coefficient', { precision: 10, scale: 4 }).default('1'),
  dividendAmount: numeric('dividend_amount', { precision: 18, scale: 4 }).default('0'),
}, (t) => ({
  pk: primaryKey({ columns: [t.symbol, t.interval, t.time] }),
  idx: index('idx_prices_sym_int_time').on(t.symbol, t.interval, t.time.desc()),
}));

export const companyOverview = pgTable('company_overview', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sector: varchar('sector', { length: 50 }),
  industry: varchar('industry', { length: 50 }),
  description: text('description'),
  website: varchar('website', { length: 255 }),
  marketCap: bigint('market_cap', { mode: 'number' }),
  peRatio: numeric('pe_ratio', { precision: 10, scale: 4 }),
  pbRatio: numeric('pb_ratio', { precision: 10, scale: 4 }),
  epsTTM: numeric('eps_ttm', { precision: 18, scale: 4 }),
  epsDiluted: numeric('eps_diluted', { precision: 18, scale: 4 }),
  bvps: numeric('bvps', { precision: 18, scale: 4 }),
  roe: numeric('roe', { precision: 10, scale: 4 }),
  roa: numeric('roa', { precision: 10, scale: 4 }),
  equity: numeric('equity', { precision: 20, scale: 2 }),
  totalAssets: numeric('total_assets', { precision: 20, scale: 2 }),
  totalLiabilities: numeric('total_liabilities', { precision: 20, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('VND'),
  country: varchar('country', { length: 2 }).default('VN'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const symbolAliases = pgTable('symbol_aliases', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  alias: varchar('alias', { length: 20 }).notNull(),
  source: varchar('source', { length: 20 }).default('manual'),
  isPrimary: boolean('is_primary').default(false),
}, (t) => ({
  uniq: uniqueIndex('uniq_alias').on(t.alias),
  idx: index('idx_alias_sym').on(t.symbol),
}));

export const technicalIndicators = pgTable('technical_indicators', {
  symbol: varchar('symbol', { length: 10 }).notNull(),
  interval: varchar('interval', { length: 5 }).notNull(),
  time: timestamp('time').notNull(),
  indicatorName: varchar('indicator_name', { length: 30 }).notNull(), // RSI, EMA20, MACD_LINE...
  value1: numeric('value_1', { precision: 18, scale: 6 }),
  value2: numeric('value_2', { precision: 18, scale: 6 }),
  value3: numeric('value_3', { precision: 18, scale: 6 }),
  source: varchar('source', { length: 20 }).default('internal'),
}, (t) => ({
  pk: primaryKey({ columns: [t.symbol, t.interval, t.time, t.indicatorName] }),
  idx: index('idx_tech_sym_int_time').on(t.symbol, t.interval, t.time.desc()),
}));

export const marketValuationSnapshots = pgTable('market_valuation_snapshots', {
  scope: varchar('scope', { length: 20 }).notNull(), // MARKET, HOSE, HNX, SECTOR:TECH
  date: timestamp('date').notNull(),
  peMedian: numeric('pe_median', { precision: 10, scale: 4 }),
  pbMedian: numeric('pb_median', { precision: 10, scale: 4 }),
  pePercentile: numeric('pe_percentile', { precision: 5, scale: 2 }),
  pbPercentile: numeric('pb_percentile', { precision: 5, scale: 2 }),
  totalMarketCap: bigint('total_market_cap', { mode: 'number' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.scope, t.date] }),
}));

export const valuationSummaryCache = pgTable('valuation_summary_cache', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  peCurrent: numeric('pe_current', { precision: 10, scale: 4 }),
  peMedian1Y: numeric('pe_median_1y', { precision: 10, scale: 4 }),
  peMedian3Y: numeric('pe_median_3y', { precision: 10, scale: 4 }),
  pePercentile: numeric('pe_percentile', { precision: 5, scale: 2 }),
  pbCurrent: numeric('pb_current', { precision: 10, scale: 4 }),
  pbMedian1Y: numeric('pb_median_1y', { precision: 10, scale: 4 }),
  pbPercentile: numeric('pb_percentile', { precision: 5, scale: 2 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const quotes = pgTable('quotes', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  price: numeric('price', { precision: 18, scale: 4 }).notNull(),
  change: numeric('change', { precision: 18, scale: 4 }),
  percentChange: numeric('percent_change', { precision: 18, scale: 4 }),
  volume: bigint('volume', { mode: 'number' }),
  high: numeric('high', { precision: 18, scale: 4 }),
  low: numeric('low', { precision: 18, scale: 4 }),
  open: numeric('open', { precision: 18, scale: 4 }),
  previousClose: numeric('previous_close', { precision: 18, scale: 4 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const latestIndicators = pgTable('latest_indicators', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  timeframe: varchar('timeframe', { length: 5 }).default('1d'),
  updatedAt: timestamp('updated_at').defaultNow(),
  rsi14: numeric('rsi_14', { precision: 10, scale: 4 }),
  ema20: numeric('ema_20', { precision: 18, scale: 4 }),
  ema50: numeric('ema_50', { precision: 18, scale: 4 }),
  macdLine: numeric('macd_line', { precision: 18, scale: 4 }),
  macdSignal: numeric('macd_signal', { precision: 18, scale: 4 }),
  macdHist: numeric('macd_hist', { precision: 18, scale: 4 }),
});

export const signals = pgTable('signals', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  timeframe: varchar('timeframe', { length: 5 }).default('1d'),
  type: varchar('type', { length: 10 }).notNull(),
  strength: varchar('strength', { length: 10 }),
  score: integer('score'),
  reasons: jsonb('reasons').default([]),
  triggeredAt: timestamp('triggered_at').defaultNow(),
  isActive: boolean('is_active').default(true),
});

export const fundamentalsQuarterly = pgTable('fundamentals_quarterly', {
  symbol: varchar('symbol', { length: 10 }).notNull(),
  quarter: varchar('quarter', { length: 7 }).notNull(),
  reportDate: timestamp('report_date').notNull(),
  revenue: numeric('revenue', { precision: 20, scale: 2 }),
  netIncome: numeric('net_income', { precision: 20, scale: 2 }),
  eps: numeric('eps', { precision: 18, scale: 4 }),
  bvps: numeric('bvps', { precision: 18, scale: 4 }),
  sharesOutstanding: bigint('shares_outstanding', { mode: 'number' }),
  roe: numeric('roe', { precision: 10, scale: 4 }),
  roa: numeric('roa', { precision: 10, scale: 4 }),
  debtToEquity: numeric('debt_to_equity', { precision: 10, scale: 4 }),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.symbol, t.quarter] }) }));

export const valuationHistory = pgTable('valuation_history', {
  symbol: varchar('symbol', { length: 10 }).notNull(),
  date: timestamp('date').notNull(),
  pe: numeric('pe', { precision: 10, scale: 4 }),
  pb: numeric('pb', { precision: 10, scale: 4 }),
  epsTTM: numeric('eps_ttm', { precision: 18, scale: 4 }),
  marketCap: bigint('market_cap', { mode: 'number' }),
}, (t) => ({ pk: primaryKey({ columns: [t.symbol, t.date] }) }));

export const advancedSignals = pgTable('advanced_signals', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  timeframe: varchar('timeframe', { length: 5 }).default('1d'),
  score: integer('score'),
  metadata: jsonb('metadata').default({}),
  triggeredAt: timestamp('triggered_at').defaultNow(),
});
