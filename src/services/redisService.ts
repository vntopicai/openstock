import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = createClient({ url: redisUrl });

redis.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect();
    console.log('✅ Connected to Redis');
  }
};

export const setQuoteCache = async (symbol: string, data: any, ttlSeconds: number = 5) => {
  await redis.set(`quote:${symbol}`, JSON.stringify(data), { EX: ttlSeconds });
};

export const getQuoteCache = async (symbol: string) => {
  const data = await redis.get(`quote:${symbol}`);
  return data ? JSON.parse(data) : null;
};
