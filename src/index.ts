import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';
import { connectRedis } from './services/redisService';
import { initWSManager } from './services/wsManager';
import { initWorker } from './workers/computationWorker';
import { initFundamentalWorker } from './workers/fundamentalWorker';
import { stockRoutes } from './routes/stock';
import { searchRoutes } from './routes/search';
import { technicalRoutes } from './routes/technical';
import { fundamentalRoutes, advancedSignalRoutes } from './routes/fundamentals';
import { wsRoutes } from './routes/websocket';

new Elysia()
  .use(cors()).use(websocket())
  .onStart(async () => {
    await connectRedis(); await initWSManager();
    initWorker().catch(console.error); initFundamentalWorker().catch(console.error);
    console.log(`🚀 Stock API running on port ${process.env.PORT || 3000}`);
  })
  .group('/api/v1', app => app.use(stockRoutes).use(searchRoutes).use(technicalRoutes).use(fundamentalRoutes).use(advancedSignalRoutes))
  .use(wsRoutes)
  .listen(process.env.PORT || 3000);
