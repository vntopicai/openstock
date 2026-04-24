import { Elysia, t } from 'elysia';
import { getLatestIndicators, getRecentSignals, computeTechnicalAnalysis } from '../services/techAnalysisService';

export const technicalRoutes = new Elysia({ prefix: '/api/v1' })
  .get('/technical/:symbol/indicators', async ({ params, set }) => {
    let d = await getLatestIndicators(params.symbol.toUpperCase());
    if (!d.length) { const c = await computeTechnicalAnalysis(params.symbol.toUpperCase()); if (!c) { set.status=404; return {error:'No data'};} d=[c.indicators]; }
    return { symbol: params.symbol.toUpperCase(), timeframe: '1d', indicators: d[0] };
  })
  .get('/signals/:symbol', async ({ params, query }) => {
    return { symbol: params.symbol.toUpperCase(), signals: await getRecentSignals(params.symbol.toUpperCase(), +(query.limit||5)) };
  }, { query: t.Object({ limit: t.Optional(t.String()) }) });
