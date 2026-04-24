import { createClient } from 'redis';
import type { ServerWebSocket } from 'elysia';

const activeSubscriptions = new Map<string, Set<ServerWebSocket>>();
const clientSubscriptions = new WeakMap<ServerWebSocket, Set<string>>();
const clientState = new WeakMap<ServerWebSocket, { apiKey: string; msgCount: number; lastReset: number }>();
const redisSub = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const RATE_LIMIT = 10, RATE_WINDOW = 1000;

export async function initWSManager() {
  if (redisSub.isOpen) return;
  await redisSub.connect();
  await redisSub.pSubscribe('quote:*', handleRedisMessage);
  await redisSub.pSubscribe('signals:*', handleRedisMessage);
  console.log('✅ WSManager: Redis Subscribed');
}

function handleRedisMessage(message: string, channel: string) {
  const subs = activeSubscriptions.get(channel);
  if (!subs?.size) return;
  const payload = JSON.stringify({ type: channel.startsWith('quote:') ? 'quote' : 'signal', channel, data: JSON.parse(message) });
  for (const ws of subs) if (ws.readyState === 1) ws.send(payload);
}

export function registerClient(ws: ServerWebSocket, apiKey: string) {
  clientSubscriptions.set(ws, new Set());
  clientState.set(ws, { apiKey, msgCount: 0, lastReset: Date.now() });
}

export function unregisterClient(ws: ServerWebSocket) {
  const subs = clientSubscriptions.get(ws);
  if (subs) for (const key of subs) { activeSubscriptions.get(key)?.delete(ws); if (!activeSubscriptions.get(key)?.size) activeSubscriptions.delete(key); }
  clientSubscriptions.delete(ws); clientState.delete(ws);
}

export function checkRateLimit(ws: ServerWebSocket): boolean {
  const st = clientState.get(ws); if (!st) return false;
  const now = Date.now(); if (now - st.lastReset > RATE_WINDOW) { st.msgCount = 0; st.lastReset = now; }
  return ++st.msgCount <= RATE_LIMIT;
}

export function handleClientMessage(ws: ServerWebSocket, raw: string) {
  if (!checkRateLimit(ws)) { ws.send(JSON.stringify({ type: 'error', code: 429, message: 'Rate limit' })); return; }
  try {
    const msg = JSON.parse(raw), subs = clientSubscriptions.get(ws); if (!subs) return;
    if (msg.type === 'subscribe' && Array.isArray(msg.symbols) && ['quote','signal'].includes(msg.channel)) {
      for (const s of msg.symbols) { const k = `${msg.channel}:${s.toUpperCase()}`; activeSubscriptions.set(k, activeSubscriptions.get(k) || new Set()); activeSubscriptions.get(k)!.add(ws); subs.add(k); }
      ws.send(JSON.stringify({ type: 'subscribed', channel: msg.channel, symbols: msg.symbols }));
    } else if (msg.type === 'unsubscribe' && Array.isArray(msg.symbols)) {
      for (const s of msg.symbols) { const k = `${msg.channel}:${s.toUpperCase()}`; activeSubscriptions.get(k)?.delete(ws); subs.delete(k); }
      ws.send(JSON.stringify({ type: 'unsubscribed', channel: msg.channel, symbols: msg.symbols }));
    } else if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
  } catch { ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' })); }
}
