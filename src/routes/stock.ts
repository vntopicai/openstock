import { Elysia, t } from 'elysia';
import { getHistoricalData, getLatestQuote } from '../services/stockService';

export const stockRoutes = new Elysia({ prefix: '/api/v1/stock' })
  .get('/time-series', async ({ query, set }) => {
    const data = await getHistoricalData(query.symbol, query.outputsize as any);
    return { meta: { symbol: query.symbol.toUpperCase(), interval: '1d', currency: 'VND' }, data: data.map(c => ({ time: c.date.getTime()/1000, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: c.volume })) };
  }, { query: t.Object({ symbol: t.String(), outputsize: t.Optional(t.String()) }) })
  .get('/quote', async ({ query, set }) => {
    const q = await getLatestQuote(query.symbol);
    if (!q) { set.status = 404; return { error: 'Not found' }; }
    return q;
  }, { query: t.Object({ symbol: t.String() }) });
