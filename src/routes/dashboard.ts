import { Elysia } from 'elysia';

export const dashboardRoutes = new Elysia({ prefix: '/api/v1/dashboard' })
  .get('/overview', async () => ({ success: true, data: { message: 'Dashboard overview' } }))
  .get('/valuation', async () => ({ success: true, data: { message: 'Dashboard valuation' } }));
