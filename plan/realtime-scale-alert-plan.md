# Realtime Scale and Signal Alert Plan

Last updated: 2026-04-24 (Asia/Ho_Chi_Minh)

## 1. Objective

Build a scalable market data ingestion and alerting pipeline that avoids per-symbol bottlenecks while enabling near-realtime signal alerts for the dashboard.

Primary goals:
- support full HOSE universe snapshots efficiently
- keep alert latency low for critical signal changes
- control provider load with chunking, caching, and backoff
- keep architecture compatible with current monorepo plan

## 2. Key Findings (Verified)

- VPS batch endpoint supports multi-symbol input:
  - `GET https://bgapidatafeed.vps.com.vn/getliststockdata/{sym1,sym2,...}`
- VPS universe endpoint:
  - `GET https://bgapidatafeed.vps.com.vn/getlistckindex/hose`
- Tested with full HOSE list (403 symbols): response returned full count in a single request.
- CafeF stream negotiation endpoint is available:
  - `POST https://realtime.cafef.vn/hub/priceshub/negotiate?negotiateVersion=1`
- `MatchPrice` provides rich intraday tick/aggregate data but is symbol-scoped:
  - `GET https://msh-appdata.cafef.vn/rest-api/api/v1/MatchPrice?symbol={ticker}&date={yyyymmdd}`

Conclusion:
- Use VPS batch snapshot as primary market-scale layer.
- Use `MatchPrice` selectively for high-priority symbols and alert confirmation.
- Add stream ingestion for lower latency where required.

## 3. Data Source Strategy

## 3.1 Primary source (market scale)

- Universe: `getlistckindex/{exchange}`
- Snapshot quotes: `getliststockdata/{comma-separated symbols}`

Usage:
- HOSE/HNX/UPCOM snapshots on schedule
- market movers, breadth approximations, heatmaps, ranking, screeners

## 3.2 Secondary source (intraday microstructure)

- `MatchPrice` for selected symbols only:
  - watchlist
  - top movers
  - symbols near alert thresholds

Usage:
- trigger confirmation
- volume burst and tape-speed conditions
- intraday profile and micro momentum

## 3.3 Stream layer (near realtime)

- CafeF prices hub (`realtime.cafef.vn/hub/priceshub`) for push updates.

Usage:
- low-latency refresh for subscribed symbols
- reduce polling pressure during active sessions

## 4. Target Capabilities

## 4.1 Scale capabilities

- Full exchange snapshot ingestion with chunked symbol batches.
- Snapshot cache for API serving within strict latency budgets.
- Degraded mode fallback when a provider is unavailable.

## 4.2 Realtime alert capabilities

- Near-realtime alerting on:
  - breakout + abnormal volume
  - rapid price acceleration/deceleration
  - intraday reversal near key levels
  - large flow shift in monitored symbols

## 5. Architecture

## 5.1 Pipeline overview

1. Universe loader
   - refresh symbol list by exchange
2. Snapshot collector
   - call VPS batch quote endpoint in chunked mode
3. Normalizer
   - map provider fields to internal typed DTOs
4. Feature engine
   - compute rolling intraday features and trigger candidates
5. Selective detail fetch
   - call `MatchPrice` only for candidate symbols
6. Alert engine
   - evaluate rules, confidence, cooldown, dedupe
7. Publisher
   - persist alerts + push to API/web socket channels

## 5.2 Storage model (minimum)

- `symbol_master`
- `quote_snapshot_intraday`
- `matchprice_ticks` (short TTL or partitioned storage)
- `feature_state_intraday`
- `alert_events`
- `ingestion_health_log`

## 6. Polling, Chunking, and Rate Control

## 6.1 Chunk policy

- chunk symbols into fixed groups (start with 50 symbols/chunk).
- evaluate provider behavior and tune to 30-100 per chunk.

## 6.2 Cadence policy

- Trading hours:
  - snapshot polling every 3-5 seconds for top universe or every 10-15 seconds full universe
  - faster cadence for subscribed/watchlist set
- Off-hours:
  - reduce to low-frequency heartbeat

## 6.3 Protection controls

- exponential backoff on transport errors
- circuit breaker per provider
- stale-data guardrails in API responses (`as_of`, freshness flags)
- bounded retries with jitter

## 7. Realtime Alert Design

## 7.1 Alert classes (V1)

- `price_breakout_confirmed`
- `volume_spike_intraday`
- `momentum_acceleration`
- `momentum_reversal`
- `flow_regime_shift` (when flow source available)

## 7.2 Rule structure

Each rule must include:
- trigger condition
- minimum confirmation window
- cooldown period
- severity and confidence score
- suppression rule to avoid repeated noise

## 7.3 Two-step trigger model

- Step 1: candidate from batch snapshot features
- Step 2: confirm via `MatchPrice` or stream tick sequence

This preserves scale while keeping alert quality.

## 8. API Plan Additions

Add or formalize these endpoints:

- `GET /realtime/snapshots?exchange=HOSE&symbols=...`
- `GET /realtime/alerts?scope=market|watchlist|ticker`
- `GET /realtime/alerts/{ticker}/latest`
- `GET /realtime/health/providers`

Optional push channel:
- `WS /realtime/alerts/stream`

Response envelope must keep:
- `as_of`
- `data_delay_minutes`
- `session_state`
- `mode` (if dashboard-bound)
- `disclaimer`

## 9. Implementation Phases

## Phase 1: Batch Snapshot Foundation

- implement symbol universe loader
- implement chunked VPS snapshot collector
- store and expose normalized snapshots
- add ingestion health metrics

Acceptance:
- stable ingestion for full HOSE universe
- API serves fresh snapshots within target latency

## Phase 2: Alert Engine V1

- implement feature state and rule evaluation
- add cooldown, dedupe, confidence scoring
- persist and expose alert events

Acceptance:
- alerts fire correctly on replay and live session tests
- false duplicate rate under agreed threshold

## Phase 3: Selective `MatchPrice` Confirmation

- implement candidate-based detail fetch
- add microstructure confirmation path

Acceptance:
- improved precision for breakout/volume alerts
- bounded provider load

## Phase 4: Stream Integration

- integrate `priceshub` client
- merge stream ticks with polling state
- auto-fallback to polling when stream is unstable

Acceptance:
- lower median alert latency
- resilient failover behavior

## 10. Risks and Mitigations

- Provider schema drift:
  - enforce adapter contracts + schema validators
- Provider throttling:
  - chunk tuning, retries, circuit breaker
- Alert noise:
  - two-step trigger, cooldown, suppression
- Data staleness:
  - freshness checks and API-level stale flags

## 11. Operational Metrics

- ingestion success rate by provider
- snapshot latency and freshness
- alert latency (event-to-publish)
- alert precision proxy (confirmed vs reverted signals)
- error rate by endpoint and chunk size

## 12. Immediate Action Checklist

1. Implement `symbol_master` refresh from `getlistckindex/*`.
2. Build chunked collector for `getliststockdata/{symbols}`.
3. Add normalized quote snapshot table + cache write path.
4. Implement first 3 alert rules (`breakout`, `volume_spike`, `acceleration`).
5. Add selective `MatchPrice` confirmer for triggered symbols.
6. Add provider health endpoint and dashboard panel.

