import { Elysia, t } from 'elysia';
import { searchStocks } from '../services/stockService';

export const searchRoutes = new Elysia({ prefix: '/api/v1' })
  .get('/search', async ({ query }) => {
    const res = await searchStocks(query.q);
    return { count: res.length, result: res };
  }, { query: t.Object({ q: t.String() }) });
