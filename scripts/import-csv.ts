import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { stockPrices, stocks, exchanges } from "../src/db/schema";
import fs from "fs/promises";
import path from "path";

// ─── Config ───────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/openstock";

const dataDir = path.join(process.cwd(), "data");

// Map CSV filenames to exchange codes
const EXCHANGE_MAP: Record<string, string> = {
  hsx: "HOSE",
  hnx: "HNX",
  upcom: "UPCOM",
};

// ─── DB Connection ────────────────────────────────────────────

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// ─── Helper for Dates ─────────────────────────────────────────

function parseYYYYMMDD(dateStr: string): Date {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return new Date(`${y}-${m}-${d}T00:00:00Z`);
}

// ─── Main Import ──────────────────────────────────────────────

const runImport = async () => {
  console.log("⏳ Starting CSV import process...");
  console.log(`📂 Data directory: ${dataDir}`);
  const start = Date.now();

  try {
    // 1. Seed Exchanges first
    console.log("\n🏦 Seeding exchanges...");
    const exchangeData = [
      { id: "HOSE", name: "Ho Chi Minh Stock Exchange" },
      { id: "HNX", name: "Hanoi Stock Exchange" },
      { id: "UPCOM", name: "Unlisted Public Company Market" }
    ];
    await db.insert(exchanges).values(exchangeData).onConflictDoNothing();
    console.log("    ✅ Exchanges seeded");

    const files = await fs.readdir(dataDir);
    const csvFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".csv"
    );

    if (csvFiles.length === 0) {
      console.log("🟡 No CSV files found in the data directory.");
      return;
    }

    console.log(`📄 Found ${csvFiles.length} CSV file(s): ${csvFiles.join(", ")}`);

    // Track all unique symbols per exchange for stocks table
    const symbolExchangeMap = new Map<string, string>();

    for (const file of csvFiles) {
      // Derive exchange from filename (e.g., "HSX.Upto10.02.2026.csv" → "HOSE")
      const fileBasename = path.basename(file, ".csv").toLowerCase();
      let exchange = "UNKNOWN";
      for (const [key, val] of Object.entries(EXCHANGE_MAP)) {
        if (fileBasename.startsWith(key)) {
          exchange = val;
          break;
        }
      }

      console.log(`\n📊 Processing: ${file} (Exchange: ${exchange})`);
      const filePath = path.join(dataDir, file);

      // Read entire file (it's ~66MB max, fits in memory)
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      
      const batchSize = 5000;
      let batch: Array<typeof stockPrices.$inferInsert> = [];
      let totalImported = 0;
      let skipped = 0;

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(",");
        if (parts.length < 7) {
          skipped++;
          continue;
        }

        const ticker = parts[0].trim();
        const dateStr = parts[1].trim();
        const openStr = parts[2].trim();
        const highStr = parts[3].trim();
        const lowStr = parts[4].trim();
        const closeStr = parts[5].trim();
        const volumeStr = parts[6].trim();

        if (!ticker || !dateStr) {
          skipped++;
          continue;
        }

        const dateValue = parseYYYYMMDD(dateStr);
        if (isNaN(dateValue.getTime())) {
          skipped++;
          continue;
        }

        const open = parseFloat(openStr);
        const high = parseFloat(highStr);
        const low = parseFloat(lowStr);
        const close = parseFloat(closeStr);
        const volume = parseInt(volumeStr, 10);

        if (isNaN(open) || isNaN(close) || isNaN(volume)) {
          skipped++;
          continue;
        }

        if (!symbolExchangeMap.has(ticker)) {
          symbolExchangeMap.set(ticker, exchange);
        }

        batch.push({
          symbol: ticker,
          interval: "1d",
          time: dateValue,
          open: open.toString(),
          high: high.toString(),
          low: low.toString(),
          close: close.toString(),
          volume,
          source: "csv-import",
          splitCoefficient: "1",
          dividendAmount: "0"
        });

        if (batch.length >= batchSize) {
          await db.insert(stockPrices).values(batch).onConflictDoNothing();
          totalImported += batch.length;
          process.stdout.write(
            `\r    📥 Imported ${totalImported.toLocaleString()} records...`
          );
          batch = [];
        }
      }

      if (batch.length > 0) {
        await db.insert(stockPrices).values(batch).onConflictDoNothing();
        totalImported += batch.length;
      }

      console.log(
        `\n    ✅ ${file}: ${totalImported.toLocaleString()} records imported, ${skipped} skipped`
      );
    }

    // ─── Populate stocks table ─────────────────────────────
    console.log(
      `\n👥 Populating stocks table (${symbolExchangeMap.size} symbols)...`
    );

    const stockBatch: Array<typeof stocks.$inferInsert> = [];
    for (const [symbol, exchangeId] of symbolExchangeMap) {
      stockBatch.push({
        symbol,
        exchangeId,
        name: symbol, // Placeholder
        isActive: true,
      });
    }

    // Batch insert stocks
    for (let i = 0; i < stockBatch.length; i += 500) {
      const chunk = stockBatch.slice(i, i + 500);
      await db.insert(stocks).values(chunk).onConflictDoNothing();
    }

    console.log(`    ✅ Stocks table populated with ${stockBatch.length} symbols`);

    // ─── Summary ──────────────────────────────────────────────
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n🎉 Import completed in ${elapsed}s`);
    console.log(`    Exchanges: ${[...new Set(symbolExchangeMap.values())].join(", ")}`);
    console.log(`    Symbols: ${symbolExchangeMap.size}`);
  } catch (error) {
    console.error("❌ CSV import failed:", error);
    process.exit(1);
  }

  await client.end();
  process.exit(0);
};

runImport();
