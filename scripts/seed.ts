import { db } from '../src/db';
import { stocks, exchanges, ohlcvDaily } from '../src/db/schema';

async function seed() {
  await db.insert(exchanges).values([{id:'HOSE',name:'HOSE',timezone:'Asia/Ho_Chi_Minh'}]).onConflictDoNothing();
  const syms = ['FPT','VCB','HPG','VIC','MWG'];
  for (const s of syms) await db.insert(stocks).values({symbol:s,exchangeId:'HOSE',name:`${s} Corp`,isActive:true}).onConflictDoNothing();
  const recs: any[] = []; const today = new Date();
  for (const s of syms) {
    let p = 50000 + Math.random()*10000;
    for (let i=0;i<100;i++) {
      const d = new Date(today); d.setDate(d.getDate()-i); d.setUTCHours(0,0,0,0);
      const ch = (Math.random()-0.5)*2000, o=p, c=p+ch, h=Math.max(o,c)+Math.random()*500, l=Math.min(o,c)-Math.random()*500;
      recs.push({symbol:s,date:d,open:o.toString(),high:h.toString(),low:l.toString(),close:c.toString(),volume:Math.floor(Math.random()*1e6)+1e5,adjustedClose:c.toString()});
      p=c;
    }
  }
  await db.insert(ohlcvDaily).values(recs).onConflictDoNothing();
  console.log('✅ OHLCV seeded'); process.exit(0);
}
seed().catch(console.error);
