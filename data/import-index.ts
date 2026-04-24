import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { indexCandles, indices } from "../packages/db/src/schema/market";

// ─── Config ───────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://t3stock:dev_password@localhost:5432/t3stock";

const HIST_BASE = "https://histdatafeed.vps.com.vn";

const INDEX_SYMBOLS = [
  { symbol: "VNINDEX", id: "VNINDEX", name: "VN-Index", exchange: "HOSE" },
  { symbol: "HNX-INDEX", id: "HNX", name: "HNX-Index", exchange: "HNX" },
  { symbol: "UPCOM-INDEX", id: "UPCOM", name: "UPCOM-Index", exchange: "UPCOM" },
];

// ─── DB Connection ────────────────────────────────────────────

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// ─── Main ─────────────────────────────────────────────────────

const runImport = async () => {
  console.log("⏳ Starting index candle import...");
  const start = Date.now();

  try {
    for (const idx of INDEX_SYMBOLS) {
      console.log(`\n📊 Fetching ${idx.name} (${idx.symbol})...`);

      // Fetch maximum history (from 2000 to now)
      const from = Math.floor(new Date("2000-01-01").getTime() / 1000);
      const to = Math.floor(Date.now() / 1000);

      const url = `${HIST_BASE}/tradingview/history?symbol=${idx.symbol}&resolution=D&from=${from}&to=${to}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "T3Stock/1.0" },
      });

      if (!res.ok) {
        console.log(`    ❌ HTTP ${res.status} for ${idx.symbol}`);
        continue;
      }

      const data = await res.json() as {
        s: string;
        t: number[];
        o: number[];
        h: number[];
        l: number[];
        c: number[];
        v: number[];
      };

      if (data.s !== "ok" || !data.t || data.t.length === 0) {
        console.log(`    ⚠️ No data for ${idx.symbol} (status: ${data.s})`);
        continue;
      }

      console.log(`    📥 Got ${data.t.length} candles`);

      // Upsert index metadata
      await db
        .insert(indices)
        .values({
          index_id: idx.id,
          exchange: idx.exchange,
          name: idx.name,
          level: data.c[data.c.length - 1],
        })
        .onConflictDoNothing();

      // Batch insert candles
      const batchSize = 5000;
      let totalImported = 0;

      for (let i = 0; i < data.t.length; i += batchSize) {
        const batch: Array<typeof indexCandles.$inferInsert> = [];

        for (let j = i; j < Math.min(i + batchSize, data.t.length); j++) {
          batch.push({
            index_id: idx.id,
            resolution: "D",
            time: new Date((data.t[j] ?? 0) * 1000),
            open: data.o[j] ?? 0,
            high: data.h[j] ?? 0,
            low: data.l[j] ?? 0,
            close: data.c[j] ?? 0,
            volume: data.v[j] ?? 0,
            value: 0,
          });
        }

        await db.insert(indexCandles).values(batch).onConflictDoNothing();
        totalImported += batch.length;
        process.stdout.write(`\r    📥 Imported ${totalImported} candles...`);
      }

      console.log(`\n    ✅ ${idx.name}: ${totalImported} candles imported`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n🎉 Index import completed in ${elapsed}s`);
  } catch (error) {
    console.error("❌ Index import failed:", error);
    process.exit(1);
  }

  await client.end();
  process.exit(0);
};

runImport();
