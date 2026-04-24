import { Elysia, t } from 'elysia';
import { getFundamentalOverview, getValuationHistory } from '../services/fundamentalService';
import { db } from '../db';
import { advancedSignals } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const fundamentalRoutes = new Elysia({ prefix: '/api/v1/fundamentals' })
  .get('/:symbol/overview', async ({ params, set }) => {
    const d = await getFundamentalOverview(params.symbol);
    if (!d) { set.status=404; return {error:'Not found'}; } return d;
  })
  .get('/:symbol/valuation', async ({ params, query }) => {
    const h = await getValuationHistory(params.symbol, +(query.days||365));
    return { symbol: params.symbol.toUpperCase(), history: h.map(r=>({time:r.date.getTime()/1000, pe:r.pe?+r.pe:null, pb:r.pb?+r.pb:null, epsTTM:r.epsTTM?+r.epsTTM:null, marketCap:r.marketCap})) };
  }, { query: t.Object({ days: t.Optional(t.String()) }) });

export const advancedSignalRoutes = new Elysia({ prefix: '/api/v1/signals' })
  .get('/advanced/:symbol', async ({ params, query }) => {
    return { symbol: params.symbol.toUpperCase(), signals: await db.select().from(advancedSignals).where(eq(advancedSignals.symbol, params.symbol.toUpperCase())).orderBy(desc(advancedSignals.triggeredAt)).limit(+(query.limit||10)) };
  }, { query: t.Object({ limit: t.Optional(t.String()) }) });
