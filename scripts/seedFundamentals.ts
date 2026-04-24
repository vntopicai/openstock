import { db } from '../src/db';
import { fundamentalsQuarterly } from '../src/db/schema';

async function seed() {
  const qs = ['2023-Q4','2024-Q1','2024-Q2','2024-Q3'];
  const data = qs.map((q,i)=>({symbol:'FPT',quarter:q,reportDate:new Date(2024,i*3,15),revenue:(10000+i*500).toString(),netIncome:(1500+i*100).toString(),eps:(2.5+i*0.2).toString(),bvps:(18+i*0.5).toString(),sharesOutstanding:1200000000,roe:(18+i).toString(),roa:(8+i*0.5).toString(),debtToEquity:'0.65'}));
  await db.insert(fundamentalsQuarterly).values(data).onConflictDoNothing();
  console.log('✅ Fundamentals seeded'); process.exit(0);
}
seed().catch(console.error);
