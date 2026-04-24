# Resource Plan: Endpoint Inventory + CSV Data Coverage

Last updated: 2026-04-22 (Asia/Ho_Chi_Minh)

## 1. Scope and Goal

This document consolidates:
- all currently discovered endpoints (VPS + CafeF stack)
- what the current CSV dataset can and cannot support
- missing data/resources required for full feature completion
- implementation priorities for API + valuation + dashboard coverage

This is the execution reference for data integration and backend resource planning.

## 2. CSV Dataset Coverage (Current)

Input format:

`<Ticker>,<DTYYYYMMDD>,<Open>,<High>,<Low>,<Close>,<Volume>`

Example:

`AAA,20260210,7.75,7.87,7.74,7.84,1375700`

### 2.1 What CSV already enables

- Daily OHLCV history per ticker
- Price/volume-based analytics:
  - returns
  - moving averages
  - RSI/MACD/ATR
  - volatility and momentum signals
  - gap and breakout heuristics
- Market movers (gainers/losers/volume spike) if full universe CSV is loaded

### 2.2 What CSV does not include

- EPS/Net Income per share
- BVPS or equity per share
- Shares outstanding history
- Corporate actions (split/dividend/rights/bonus)
- Ownership, estimates, news, macro, sector taxonomy
- Official index constituent weights/contribution inputs

Conclusion:
- CSV alone is enough for technical and basic market movement logic.
- CSV alone is NOT enough for reliable `P/E` and `P/B`.

## 3. Endpoint Inventory

## 3.1 VPS endpoints

| Endpoint | Purpose | Current status | Notes |
|---|---|---|---|
| `https://bgapidatafeed.vps.com.vn/getlistckindex/hose` | Universe list by exchange | Working | Returns list of symbols |
| `https://histdatafeed.vps.com.vn/tradingview/symbols?symbol={ticker}` | Symbol metadata/session/resolution | Working | Good for chart metadata |
| `https://bgapidatafeed.vps.com.vn/getliststockdata/{ticker}` | Realtime quote and board levels | Working | Includes bid/ask levels + foreign room fields |
| `https://bgapidatafeed.vps.com.vn/getliststockbaseinfo/{ticker}` | Financial snapshots and ratios | Working | Contains quarterly/yearly statement blocks + ratios |
| `https://histdatafeed.vps.com.vn/company/events/{ticker}` | Corporate/company events | Working | Useful for catalyst and timeline |

## 3.2 CafeF endpoints (verified usable)

| Endpoint | Purpose | Response type |
|---|---|---|
| `https://cafef.vn/du-lieu/Ajax/PageNew/RealtimePricesHeader.ashx?symbols=AAA;HPG;VCB` | Multi-symbol realtime snapshot | JSON |
| `https://cafef.vn/du-lieu/Ajax/PageNew/RealtimeChartHeader.ashx?index=1;2&type=chart` | Intraday index chart data | JSON |
| `https://msh-datacenter.cafef.vn/price/api/v1/CompanyCompac/RealTimeChartHeader?index=1;2` | Realtime chart header source | JSON |
| `https://msh-appdata.cafef.vn/rest-api/api/v1/Liquidity/HOSE` | Market liquidity time series | JSON |
| `https://msh-appdata.cafef.vn/rest-api/api/v1/MarketLeaderGroup?centerId=1` | Market leaders/drivers | JSON |
| `https://msh-appdata.cafef.vn/rest-api/api/v1/OverviewOrgnizaztion/0/2026-04-22/15?symbol=AAA` | Organization flow series (type 0) | JSON |
| `https://msh-appdata.cafef.vn/rest-api/api/v1/OverviewOrgnizaztion/1/2026-04-22/20?symbol=AAA` | Organization flow series (type 1) | JSON |
| `https://search.cafef.vn/api/searching/v1/Companies/SearchByKeyWord?keyword=hoa%20phat` | Company search | JSON |
| `https://cafef.vn/du-lieu/Ajax/CongTy/ThongTinChung.aspx?sym=AAA` | Company profile block | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/CongTy/BanLanhDao.aspx?sym=AAA` | Management/leadership block | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/CongTy/CongTyCon.aspx?sym=AAA` | Subsidiary block | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/CongTy/BaoCaoTaiChinh.aspx?sym=AAA` | Financial report block | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/CungNganh/SamePE.aspx?symbol=AAA&PageIndex=1&PageSize=10` | Peer by PE | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/CungNganh/SameEPS.aspx?symbol=AAA&PageIndex=1&PageSize=10` | Peer by EPS | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/CungNganh/SameCategory.aspx?symbol=AAA&PageIndex=1&PageSize=10` | Peer by category | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/NDTNN.aspx?sym=AAA` | Foreign flow table | HTML fragment |
| `https://cafef.vn/du-lieu/Ajax/TKDL.aspx?sym=AAA` | Trading stats table | HTML fragment |
| `https://cafef.vn/api/getListNewestTop.chn` | Latest news list | JSON |

## 3.3 CafeF endpoints discovered but unstable/restricted

| Endpoint pattern | Observed issue |
|---|---|
| `https://cafef.vn/du-lieu/ajax/json.ashx?...` | 403 when called directly |
| `https://msh-data.cafef.vn/graphql` | 503 |
| `https://msh-pcdata.cafef.vn/graphql` | 503 |
| legacy `/mobile/smart/...` and old `/PageNew/...` variants | 404 on current host routes |

## 4. Feature Readiness Matrix

| Feature area | CSV only | CSV + VPS | CSV + VPS + CafeF |
|---|---|---|---|
| Technical indicators | Strong | Strong | Strong |
| Daily movers/screener | Strong | Strong | Strong |
| Realtime quotes/board | No | Partial | Strong |
| Market liquidity and leader group | No | Partial | Strong |
| Company events/catalyst timeline | No | Strong | Strong |
| Basic financial snapshots | No | Strong | Strong |
| Peer comparison | No | Partial | Strong (HTML parsing needed) |
| Ownership/organization flow | No | Partial | Medium-Strong |
| News feed integration | No | Limited | Medium |
| Full valuation (`P/E`, `P/B`) | No | Potentially enough if financial fields are consistent | Better redundancy but still needs normalization |

## 5. `P/E` and `P/B` Feasibility Check

## 5.1 Required formulas

- `P/E = Price / EPS_TTM`
- `P/B = Price / BVPS`

Alternative:
- `P/B = MarketCap / Equity`

## 5.2 Minimum required data

- Daily/Realtime price per ticker
- EPS (preferably TTM and report-date aware)
- BVPS or equity + shares outstanding
- Time alignment to avoid look-ahead bias

## 5.3 Current sufficiency

- With CSV only: insufficient.
- With CSV + VPS `getliststockbaseinfo`: likely sufficient for an initial valuation pipeline (subject to field stability and normalization).
- With CSV + VPS + CafeF: sufficient for V1 valuation plus cross-source sanity checks.

Important:
- Do not compute valuation from static snapshots without report-date versioning.
- Corporate actions and share changes must be tracked to keep ratios valid over time.

## 6. Missing Resources for Full Product Completion

Even with CSV + current endpoints, full feature parity still needs:

- Official index contribution methodology inputs (constituents + weights + revisions)
- Clean ownership model (institutional/insider history as structured records)
- Analyst estimates and target consensus as stable structured API
- Corporate actions normalized feed for adjusted history
- Sector taxonomy and ticker mapping source of truth
- Macro factor series (rates, FX, commodity) for tailwind/sensitivity engines
- News normalization pipeline (dedupe, tagging, sentiment)
- Batch/realtime ingestion controls (rate limits, retries, SLA monitoring)

## 7. Resource Plan (Execution)

## Phase A: Data Foundation

- Implement/validate `@import-csv.ts` into `prices_daily` table
- Add data quality checks:
  - missing ticker-day
  - duplicate key (`ticker`, `trade_date`)
  - invalid OHLCV ranges
- Build symbol master from exchange list endpoints

## Phase B: Valuation Foundation

- Create normalized financial table:
  - `financial_snapshots` (quarter/year, statement fields)
  - `ratios_snapshots` (EPS, BVPS, ROE, etc)
- Build `shares_outstanding_history`
- Add `corporate_actions`
- Implement valuation engine:
  - `pe_ttm`
  - `pb`
  - confidence/quality flags

## Phase C: API Serving

- Implement stable domain APIs:
  - quote/candles
  - valuation/multiples
  - events/calendar
  - flow summaries
- Keep source adapters isolated:
  - CSV adapter
  - VPS adapter
  - CafeF adapter
- Add caching and source fallback rules

## Phase D: Full Dashboard Readiness

- Complete stock full tabs (financial, valuation, catalysts, technical)
- Complete market full blocks (liquidity, leader group, breadth, drivers)
- Add monitoring:
  - endpoint health
  - stale data checks
  - import lag alerts

## 8. API and Data Governance Rules

- Never expose raw HTML fragments directly to frontend contracts.
- Parse and normalize to typed internal DTOs first.
- Track `as_of`, `source`, and `ingested_at` for every record.
- For multi-source fields, keep source priority + fallback order explicit.
- Any valuation shown to end users must include:
  - data timestamp
  - formula basis
  - confidence indicator

## 9. Immediate Next Actions

1. Freeze canonical schema for `prices_daily`, `financial_snapshots`, `valuation_snapshots`.
2. Wire `@import-csv.ts` into repeatable import command with idempotent upsert.
3. Build first `GET /valuation/{ticker}/multiples` from normalized tables.
4. Add validation tests for `P/E`, `P/B` time alignment and null-handling.

