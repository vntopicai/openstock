import { Elysia, t } from 'elysia';
import { registerClient, unregisterClient, handleClientMessage } from '../services/wsManager';

const VALID_KEYS = new Set(['demo-key-123', 'prod-key-456']);

export const wsRoutes = new Elysia().ws('/ws', {
  query: t.Object({ token: t.String() }),
  open(ws) {
    if (!VALID_KEYS.has(ws.query.token)) { ws.send(JSON.stringify({type:'error',code:401})); ws.close(1008); return; }
    registerClient(ws, ws.query.token);
    ws.send(JSON.stringify({type:'connected',serverTime:Date.now()}));
  },
  message(ws, msg) { handleClientMessage(ws, msg as string); },
  close(ws) { unregisterClient(ws); }
});
