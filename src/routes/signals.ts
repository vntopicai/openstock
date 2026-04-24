import { Elysia } from 'elysia';
import { getLatestSignals, getSignalHistory, evaluateSignal, getActiveMarketSignals } from '../services/signalService';

export const signalRoutes = new Elysia({ prefix: '/api/v1/signals' })
  .get('/latest/:symbol', async ({ params }) => getLatestSignals(params.symbol))
  .get('/history/:symbol', async ({ params, query }) => getSignalHistory(params.symbol, query))
  .post('/evaluate', async ({ body }) => evaluateSignal(body))
  .get('/market/active', async () => getActiveMarketSignals());
