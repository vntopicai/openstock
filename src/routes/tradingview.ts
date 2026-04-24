import { Elysia } from 'elysia';

export const tvRoutes = new Elysia({ prefix: '/tv' })
  .get('/config', () => ({ 
    supports_search: true, 
    supports_marks: true, 
    supported_resolutions: ['1', '5', '15', '30', '60', 'D', 'W', 'M'] 
  }))
  .get('/symbols', async ({ query }) => ({ /* map from stocks + company_overview */ }))
  .get('/history', async ({ query }) => ({ /* map from stock_prices */ }))
  .get('/time', () => Math.floor(Date.now() / 1000))
  .get('/marks', async ({ query }) => ({ /* map from signals + advancedSignals */ }))
  .get('/quotes', async ({ query }) => ({ /* map from quotes/redis */ }));
