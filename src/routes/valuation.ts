import { Elysia } from 'elysia';
import { getCurrentValuation, getValuationHistory, getMarketValuation, getSummary } from '../services/valuationService';

export const valuationRoutes = new Elysia({ prefix: '/api/v1/valuation' })
  .get('/current/:symbol', async ({ params }) => getCurrentValuation(params.symbol))
  .get('/history/:symbol', async ({ params, query }) => getValuationHistory(params.symbol, query))
  .get('/market/history', async ({ query }) => getMarketValuation((query as any).scope, query))
  .get('/summary/:symbol', async ({ params }) => getSummary(params.symbol));
