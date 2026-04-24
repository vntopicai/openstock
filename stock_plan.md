# Stock API Plan For Vietnam Market

## Mục tiêu
Xây dựng `stock_api` tập trung vào:

- Dữ liệu chứng khoán và chỉ số giá theo mã.
- Phân tích cơ bản doanh nghiệp.
- Phân tích kỹ thuật.
- Tín hiệu mua bán.
- Phát hiện đột biến khối lượng.
- Kiến trúc sẵn sàng cho realtime.

Phạm vi tài liệu này chỉ lấy khả năng và cách tổ chức API từ:

- `https://finnhub.io/docs/api/`
- `https://www.alphavantage.co/documentation/`

Nhưng mục tiêu triển khai là:

- **clone hoàn toàn capability**, không dùng Alpha Vantage hay Finnhub làm provider runtime chính
- xây hệ thống dữ liệu, tính toán, realtime và signal **nội bộ**
- chỉ tham chiếu hai tài liệu trên để thiết kế feature set, API contract và trải nghiệm developer

## Nguyên tắc Thiết Kế

1. Ưu tiên `Bun + Elysia + Drizzle + PostgreSQL + Redis`.
2. Thiết kế theo mô hình `internal domain first`, có thể gắn thêm source adapter sau này nhưng public API luôn là nội bộ.
3. Dữ liệu lịch sử, dữ liệu cơ bản, chỉ báo kỹ thuật và tín hiệu phải đọc được từ DB trước khi đẩy realtime.
4. Realtime là lớp tăng cường, không phải nền tảng duy nhất.
5. Tương thích thị trường Việt Nam bằng chuẩn hóa symbol, trading session, timezone, exchange metadata và rule nội bộ, không gắn chặt vào format của bất kỳ nhà cung cấp nào.

## Stack Đề Xuất

### Backend Core
- **Runtime**: Bun
- **Framework**: Elysia
- **Validation**: Zod
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 15+
- **Cache / Queue / PubSub**: Redis

### Data & Jobs
- **Ingestion Layer**: internal collectors / importers / stream consumers
- **Computation Layer**: workers cho fundamentals, technicals, valuations, signals
- **Scheduler**: Bun cron loop hoặc background worker riêng
- **Realtime Transport**: WebSocket trên Elysia

### Vì sao chọn stack này
- Bun + Elysia cho hiệu năng tốt và codebase gọn.
- Drizzle phù hợp schema time-series và migration rõ ràng.
- PostgreSQL dễ lưu cả dữ liệu chuẩn hóa lẫn tín hiệu.
- Redis phù hợp cache quote, pub/sub alert, rate-limit nội bộ, queue job nhẹ.

## Phạm vi Tính Năng

### 1. Stock Data
- Daily, weekly, monthly OHLCV.
- Intraday OHLCV theo interval `1min`, `5min`, `15min`, `30min`, `60min`.
- Quote snapshot mới nhất.
- Search symbol.
- Market status.

### 2. Fundamentals
- Company overview.
- EPS, P/E, book value, market cap, profit margin, ROE, ROA.
- Latest quarter và các chỉ số tăng trưởng theo mô hình dữ liệu nội bộ.
- Historical valuation series cho `P/E`, `P/B`, `EPS`, `BVPS`, market cap.
- Chart định giá theo từng cổ phiếu, ngành, hoặc toàn thị trường.

### 3. Technical Analysis
- EMA, SMA, RSI, MACD, Bollinger Bands.
- Volume moving average.
- Price action derived metrics nội bộ.

### 4. Signals
- EMA crossover.
- RSI overbought / oversold.
- MACD cross.
- Breakout khỏi vùng giá gần nhất.
- Volume spike.
- Composite buy / sell score.

### 5. Realtime
- WebSocket stream nội bộ cho quote và signal.
- Fan-out signal theo mã hoặc theo watchlist.
- Ưu tiên realtime stream nội bộ, fallback sang quote polling khi cần.

## Phạm Vi Clone Từ Tài Liệu Tham Chiếu

### Khả năng tham chiếu từ Alpha Vantage
Các nhóm khả năng nên clone:

- Time series stock data: `intraday`, `daily`, `weekly`, `monthly`.
- `intraday` hỗ trợ `interval=1min|5min|15min|30min|60min`.
- `intraday` hỗ trợ `adjusted=true|false`.
- `intraday` hỗ trợ `outputsize=compact|full`.
- `intraday` hỗ trợ `month=YYYY-MM`.
- `intraday` hỗ trợ `datatype=json|csv`.
- `intraday` có `entitlement=realtime|delayed` tùy gói.
- Có quote endpoint nhẹ.
- Có ticker search.
- Có market open / closure status.
- Có nhóm `Fundamental Data`.
- Có nhóm `Technical Indicators`.
- Có `Alpha Intelligence` cho news / movers.

### Khả năng tham chiếu từ Finnhub
Các nhóm khả năng nên clone:

- REST API với `token` hoặc header `X-Finnhub-Token`.
- Rate limit trả về `429` khi vượt ngưỡng.
- Có ngưỡng `30 API calls / second`.
- WebSocket stream cho `real-time trades / price updates`.
- Một API key chỉ mở được `1` websocket connection tại một thời điểm.
- Có nhóm dữ liệu fundamentals.
- Có dữ liệu market và company data đủ để làm lớp bổ sung.

### Kết luận của phần tham chiếu
Hai tài liệu này được dùng để xác định:

- phạm vi feature của `stock_api`
- cách chia nhóm endpoint
- yêu cầu đối với realtime, quote, fundamentals, technicals
- kỳ vọng về trải nghiệm API cho frontend và third-party clients

Không dùng chúng như nguồn runtime bắt buộc của hệ thống production.

## Chiến lược Tương Thích Thị Trường Việt Nam

Vì mục tiêu là thị trường Việt Nam và hệ thống cần hoạt động độc lập, plan nên đi theo hướng sau:

### 1. Chuẩn hóa mã nội bộ
Tạo chuẩn symbol nội bộ:

- `exchange`: `HOSE`, `HNX`, `UPCOM`
- `symbol`: ví dụ `FPT`, `VCB`, `HPG`
- `aliases`: danh sách mã phụ, short code hoặc raw symbol từ các nguồn ingest nếu có

Không để frontend hay signal engine phụ thuộc trực tiếp vào raw symbol format của bất kỳ nguồn ingest nào.

### 2. Chuẩn hóa market metadata
Tạo rule nội bộ cho:

- trading session
- timezone
- market status local
- price step
- trần / sàn / tham chiếu

Các rule này do hệ thống nắm giữ, không phó mặc hoàn toàn cho nguồn dữ liệu đầu vào.

### 3. Source fallback
- **Primary**: dữ liệu chuẩn hóa lưu trong hệ thống nội bộ
- **Realtime**: stream nội bộ hoặc collector nội bộ
- **Fallback**: polling / import / replay từ raw feeds hoặc batch jobs
- **Fundamentals**: tính và chuẩn hóa vào snapshot nội bộ, không phụ thuộc live source bên ngoài

### 4. Internal derived signals
Không phụ thuộc việc nguồn bên ngoài trả sẵn tín hiệu mua bán.
Hệ thống phải tự tính:

- EMA crossover
- RSI thresholds
- MACD cross
- volume spike
- breakout / pullback
- buy / sell score

## Tương Thích TradingView

Mục tiêu là để frontend có thể dùng TradingView dễ dàng mà không phải biến đổi dữ liệu quá nhiều trong client.

### 1. Chuẩn dữ liệu candle
Backend nên chuẩn hóa OHLCV theo cấu trúc gần với TradingView:

- `time`: UNIX timestamp chuẩn UTC, ưu tiên một format thống nhất cho toàn hệ thống
- `open`
- `high`
- `low`
- `close`
- `volume`

Nguyên tắc:

- Mỗi bar phải đại diện đúng một `resolution`.
- Không trả dữ liệu lẫn nhiều timezone.
- Luôn có mapping rõ giữa `interval` nội bộ và `resolution` frontend.
- Với dữ liệu daily/weekly/monthly, nên trả bar đã chuẩn hóa để frontend không phải tự resample.
- Không đổi format `time` giữa các endpoint chart.

### 2. Resolution mapping
Nội bộ nên thống nhất:

- `1` <-> `1min`
- `5` <-> `5min`
- `15` <-> `15min`
- `30` <-> `30min`
- `60` <-> `60min`
- `1D` <-> `daily`
- `1W` <-> `weekly`
- `1M` <-> `monthly`

### 3. Symbol metadata cho chart
TradingView frontend thường cần metadata ổn định cho mỗi mã. Vì vậy API cần cung cấp:

- `symbol`
- `ticker`
- `name`
- `description`
- `exchange`
- `timezone`
- `session`
- `minmov`
- `pricescale`
- `supported_resolutions`
- `has_intraday`
- `has_daily`
- `has_weekly_and_monthly`
- `volume_precision`

Khuyến nghị metadata mặc định cho thị trường Việt Nam:

- `timezone`: `Asia/Ho_Chi_Minh`
- `session`: chuỗi session nội bộ theo từng sàn
- `pricescale`: xác định theo bước giá và số lẻ hiển thị
- `minmov`: gắn với quy tắc bước giá nội bộ

### 4. Hai mức tích hợp nên hỗ trợ

#### Mức A: TradingView Lightweight Charts
Đây là mức dễ triển khai nhất.

Backend chỉ cần trả:

- candles
- volume bars
- markers cho buy/sell signal
- overlays như EMA, SMA

#### Mức B: TradingView Charting Library Datafeed
Nếu sau này dùng Charting Library đầy đủ, nên thiết kế sẵn một lớp API tương thích datafeed:

- `GET /tv/config`
- `GET /tv/symbols`
- `GET /tv/history`
- `GET /tv/time`
- `GET /tv/marks`
- `GET /tv/timescale-marks`
- `GET /tv/quotes`

Không bắt buộc triển khai ngay từ đầu, nhưng nên giữ contract dữ liệu để sau này thêm rất nhanh.

### 5. Markers và overlays
Để frontend hiển thị tín hiệu đẹp trên chart:

- `signal_events` phải map được sang marker theo timestamp.
- Indicator series phải trả được dưới dạng line series độc lập.
- Volume spike nên có cờ riêng để render thành marker hoặc histogram highlight.

### 6. Điều kiện để frontend dùng TradingView mượt
- Candle API trả dữ liệu đã sort tăng dần theo thời gian.
- Truy vấn theo `from`, `to`, `resolution` ổn định.
- Các khoảng trống phiên nghỉ được xử lý nhất quán.
- Dữ liệu corporate actions nếu có phải ảnh hưởng rõ đến adjusted/unadjusted chart.
- Tách rõ chart price data và valuation chart data.

## Kiến trúc Hệ Thống

```text
Client / Dashboard
        |
        v
   Elysia API
        |
        +-- Ingestion Layer
        |     +-- Batch Import
        |     +-- Stream Consumer
        |     +-- Normalizers
        |
        +-- Service Layer
        |     +-- Stock Service
        |     +-- Fundamentals Service
        |     +-- Indicators Service
        |     +-- Signals Service
        |     +-- Market Rules Service
        |
        +-- Redis
        |     +-- Cache
        |     +-- Pub/Sub
        |     +-- Job locks
        |
        +-- PostgreSQL
              +-- Raw data
              +-- Normalized data
              +-- Indicators
              +-- Signals
              +-- Alert logs
```

## Cấu Trúc Thư Mục Đề Xuất

```text
src/
├── index.ts
├── config/
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── migrations/
├── routes/
│   ├── stocks.ts
│   ├── fundamentals.ts
│   ├── technical.ts
│   ├── signals.ts
│   └── system.ts
├── services/
│   ├── ingestion/
│   │   ├── batch-import.ts
│   │   ├── quote-ingestor.ts
│   │   ├── candle-ingestor.ts
│   │   └── normalizer.ts
│   ├── market/
│   │   ├── symbol-normalizer.ts
│   │   ├── market-rules.ts
│   │   └── session.ts
│   ├── stock/
│   ├── fundamentals/
│   ├── technical/
│   ├── signals/
│   └── realtime/
├── workers/
│   ├── sync-intraday.ts
│   ├── sync-daily.ts
│   ├── sync-fundamentals.ts
│   ├── sync-technical.ts
│   └── signal-engine.ts
└── lib/
```

## Thiết Kế Database

### 1. `symbols`
Lưu danh mục mã nội bộ và metadata chuẩn của hệ thống.

Các cột chính:
- `id`
- `symbol`
- `exchange`
- `name`
- `currency`
- `country`
- `is_active`

### 2. `symbol_aliases`
Map giữa mã nội bộ và các alias / raw code từ những nguồn ingest khác nhau.

Các cột chính:
- `symbol_id`
- `alias_type`
- `alias_value`
- `source_name`
- `is_primary`

### 3. `stock_prices`
Lưu OHLCV chuẩn hóa.

Các cột chính:
- `symbol_id`
- `source`
- `interval`
- `time`
- `open`
- `high`
- `low`
- `close`
- `volume`
- `adjusted_close`
- `split_coefficient`
- `dividend_amount`

Index đề xuất:
- `(symbol_id, interval, time desc)`

### 4. `quote_realtime`
Snapshot giá gần nhất.

Các cột chính:
- `symbol_id`
- `source`
- `price`
- `open`
- `high`
- `low`
- `previous_close`
- `change`
- `change_percent`
- `volume`
- `latest_trading_day`
- `updated_at`

### 5. `company_overview`
Lưu phân tích cơ bản.

Các cột chính:
- `symbol_id`
- `source`
- `name`
- `description`
- `exchange`
- `sector`
- `industry`
- `market_capitalization`
- `eps`
- `pe_ratio`
- `peg_ratio`
- `book_value`
- `dividend_per_share`
- `dividend_yield`
- `profit_margin`
- `return_on_assets_ttm`
- `return_on_equity_ttm`
- `revenue_ttm`
- `gross_profit_ttm`
- `updated_at`

### 6. `fundamental_snapshots`
Lưu snapshot theo kỳ báo cáo để phục vụ biểu đồ cơ bản theo thời gian.

Các cột chính:
- `symbol_id`
- `fiscal_year`
- `fiscal_period`
- `report_date`
- `currency`
- `shares_outstanding`
- `book_value_per_share`
- `eps`
- `eps_diluted`
- `eps_ttm`
- `revenue`
- `net_income`
- `equity`
- `total_assets`
- `total_liabilities`
- `roe`
- `roa`
- `source`
- `updated_at`

Ghi chú:
- `fiscal_period` có thể là `FY`, `Q1`, `Q2`, `Q3`, `Q4`, `TTM`.
- Đây là bảng nền để tính lại `P/E`, `P/B` lịch sử thay vì chỉ lưu snapshot hiện tại.
- Cần giữ cả `FY` và `TTM` để dashboard có thể hiển thị định giá theo năm và định giá hiện tại sát thực tế hơn.

### 7. `valuation_timeseries`
Lưu chuỗi thời gian định giá để frontend vẽ chart nhanh.

Các cột chính:
- `symbol_id`
- `time`
- `interval`
- `price_close`
- `eps_ttm`
- `book_value_per_share`
- `pe_ratio`
- `pb_ratio`
- `market_cap`
- `source`
- `updated_at`

Index đề xuất:
- `(symbol_id, interval, time desc)`

Ghi chú:
- `P/E = price / EPS`
- `P/B = price / book_value_per_share`
- Có thể lưu cả dữ liệu tính sẵn để API chart nhẹ và nhanh hơn.

### 8. `market_valuation_snapshots`
Lưu định giá tổng hợp toàn thị trường hoặc theo sàn/ngành.

Các cột chính:
- `scope_type`
- `scope_value`
- `time`
- `pe_ratio`
- `pb_ratio`
- `market_cap`
- `symbol_count`
- `source`

Ví dụ:
- `scope_type=market`, `scope_value=ALL`
- `scope_type=exchange`, `scope_value=HOSE`
- `scope_type=sector`, `scope_value=BANKING`

### 9. `valuation_summary_cache`
Lưu snapshot tổng hợp phục vụ dashboard cổ phiếu, để frontend không phải tự tính nhiều lần.

Các cột chính:
- `symbol_id`
- `time`
- `current_pe`
- `current_pb`
- `pe_3y_avg`
- `pe_5y_avg`
- `pb_3y_avg`
- `pb_5y_avg`
- `pe_percentile_3y`
- `pe_percentile_5y`
- `pb_percentile_3y`
- `pb_percentile_5y`
- `market_pe`
- `market_pb`
- `sector_pe`
- `sector_pb`
- `valuation_status`
- `updated_at`

Ghi chú:
- `valuation_status` có thể là `cheap`, `fair`, `expensive`.
- Bảng này không thay thế dữ liệu gốc; nó chỉ tối ưu cho dashboard summary.

### 10. `technical_indicators`
Lưu chỉ báo đã tính hoặc đồng bộ.

Các cột chính:
- `symbol_id`
- `interval`
- `time`
- `indicator_name`
- `indicator_params`
- `value_1`
- `value_2`
- `value_3`
- `source`

Ví dụ:
- `EMA(6)`
- `EMA(20)`
- `RSI(14)`
- `MACD(12,26,9)`
- `SMA_VOLUME(20)`

### 11. `signal_events`
Lưu tín hiệu phát sinh.

Các cột chính:
- `id`
- `symbol_id`
- `interval`
- `time`
- `signal_type`
- `signal_side`
- `signal_strength`
- `price_at_signal`
- `volume_at_signal`
- `payload_json`
- `source`

### 12. `alert_subscriptions`
Lưu đăng ký alert.

Các cột chính:
- `id`
- `user_id`
- `symbol_id`
- `signal_type`
- `is_enabled`
- `created_at`

## Redis Design

### Cache Keys
- `quote:{symbol}`
- `ohlcv:{symbol}:{interval}:{range}`
- `fundamentals:{symbol}`
- `indicator:{symbol}:{interval}:{indicator}`
- `market-status:{exchange}`

### Pub/Sub Channels
- `quote-updated:{symbol}`
- `signal-created:{symbol}`
- `signal-created:all`

### Locks
- `lock:sync-intraday:{symbol}:{interval}`
- `lock:sync-fundamentals:{symbol}`
- `lock:signal-engine:{symbol}:{interval}`

## API Thiết Kế

Route prefix: `/api/v1`

### Stocks
- `GET /stocks/search?keywords=`
- `GET /stocks/:symbol/quote`
- `GET /stocks/:symbol/daily?from=&to=`
- `GET /stocks/:symbol/intraday?interval=5min&from=&to=`
- `GET /stocks/:symbol/weekly`
- `GET /stocks/:symbol/monthly`
- `GET /stocks/market-status`

### Fundamentals
- `GET /fundamentals/:symbol/overview`
- `GET /fundamentals/:symbol/metrics`
- `GET /fundamentals/:symbol/history?metric=eps&period=yearly`
- `GET /fundamentals/:symbol/financials?period=annual`

### Technical
- `GET /technical/:symbol/ema?interval=1day&period=20`
- `GET /technical/:symbol/rsi?interval=1day&period=14`
- `GET /technical/:symbol/macd?interval=1day`
- `GET /technical/:symbol/bbands?interval=1day&period=20`
- `GET /technical/:symbol/volume-ma?interval=1day&period=20`

### Signals
- `GET /signals/:symbol/latest`
- `GET /signals/:symbol/history?interval=1day`
- `POST /signals/evaluate/:symbol`
- `GET /signals/market/active`

### Valuation
- `GET /valuation/:symbol/current`
- `GET /valuation/:symbol/history?metric=pe&period=yearly`
- `GET /valuation/:symbol/history?metric=pb&period=yearly`
- `GET /valuation/market/history?scope=ALL&metric=pe`
- `GET /valuation/market/history?scope=HOSE&metric=pb`
- `GET /valuation/:symbol/summary`

### Dashboard
- `GET /dashboard/:symbol/overview`
- `GET /dashboard/:symbol/valuation`

### Realtime
- `GET /ws`
- subscription message:
  - `sub:quote:FPT`
  - `sub:signal:FPT`
  - `sub:signal:*`

### TradingView
- `GET /tv/config`
- `GET /tv/symbols?symbol=FPT`
- `GET /tv/history?symbol=FPT&resolution=1D&from=&to=`
- `GET /tv/time`
- `GET /tv/marks?symbol=FPT&from=&to=`
- `GET /tv/quotes?symbols=FPT,VCB,HPG`

## Phân Tích Định Giá P/E Và P/B

### Mục tiêu
Cho phép frontend hiển thị:

- `P/E` hiện tại của một mã
- `P/B` hiện tại của một mã
- chart `P/E` theo năm / quý / TTM
- chart `P/B` theo năm / quý / TTM
- so sánh `P/E`, `P/B` của một mã với trung bình ngành
- `P/E`, `P/B` toàn thị trường hoặc theo sàn
- định giá hiện tại đang ở mức nào so với chính lịch sử của cổ phiếu
- percentile hiện tại so với lịch sử 3 năm, 5 năm, toàn kỳ
- band định giá như `min / avg / max`, hoặc `p25 / median / p75`

### Dữ liệu tối thiểu cần có
- giá đóng cửa theo thời gian
- EPS hoặc EPS TTM theo kỳ
- book value per share theo kỳ
- market cap
- số lượng cổ phiếu lưu hành nếu cần tự tính

### Cách tính đề xuất

#### Theo từng cổ phiếu
- `P/E = closing_price / EPS_TTM`
- `P/B = closing_price / BVPS`

#### Theo toàn thị trường hoặc theo scope
- `market_pe = total_market_cap / total_net_income`
- `market_pb = total_market_cap / total_equity`

### Điều kiện để tính đúng
- Phải có chuỗi giá đóng cửa lịch sử đủ dài.
- Phải có `EPS_TTM` hoặc đủ dữ liệu quarterly để dựng `TTM`.
- Phải có `BVPS` hoặc đủ dữ liệu equity và shares outstanding để suy ra.
- Phải có chính sách xử lý khi `EPS <= 0`, vì khi đó `P/E` không còn ý nghĩa trực quan.

### Quy tắc xử lý edge cases
- Nếu `EPS_TTM <= 0`, trả `pe_ratio = null` và gắn cờ `negative_earnings`.
- Nếu `book_value_per_share <= 0`, trả `pb_ratio = null`.
- Nếu dữ liệu fundamentals quá cũ so với giá hiện tại, gắn cờ `stale_fundamentals`.
- Dashboard phải hiển thị rõ dữ liệu đang dùng `FY`, `Q`, hay `TTM`.

### Quy tắc lưu trữ
- Lưu `fundamental_snapshots` làm nguồn gốc.
- Lưu `valuation_timeseries` để query chart nhanh.
- Lưu `market_valuation_snapshots` cho các chart tổng hợp.
- Lưu `valuation_summary_cache` cho dashboard overview.
- Khi thiếu dữ liệu fundamentals mới, cho phép giữ giá trị gần nhất theo nguyên tắc forward-fill có kiểm soát.

### Loại chart frontend nên hỗ trợ
- line chart `P/E`
- line chart `P/B`
- band chart: min / avg / max valuation theo lịch sử
- compare chart: cổ phiếu vs ngành vs thị trường
- gauge hoặc badge cho trạng thái định giá hiện tại
- sparkline mini cho valuation summary trong dashboard

### Dữ liệu dashboard nên trả sẵn từ backend
`GET /dashboard/:symbol/valuation` hoặc `GET /valuation/:symbol/summary` nên trả trực tiếp:

- `current_pe`
- `current_pb`
- `pe_percentile_3y`
- `pe_percentile_5y`
- `pb_percentile_3y`
- `pb_percentile_5y`
- `historical_pe_min`
- `historical_pe_avg`
- `historical_pe_max`
- `historical_pb_min`
- `historical_pb_avg`
- `historical_pb_max`
- `sector_pe`
- `sector_pb`
- `market_pe`
- `market_pb`
- `valuation_status`
- `explanation`

Như vậy frontend chỉ việc render:

- `P/E hiện tại đang thấp hơn 78% lịch sử 5 năm`
- `P/B hiện tại gần median 3 năm`
- `định giá hiện tại: hợp lý / rẻ / đắt`

### Trường hợp dùng với TradingView
TradingView chủ yếu phù hợp cho price chart. Với valuation chart:

- có thể dùng TradingView line series nếu muốn đồng nhất UI
- hoặc dùng chart library riêng cho fundamentals nếu cần nhiều trục và annotation

Thiết kế backend nên cho phép cả hai:

- endpoint trả time-series valuation cực kỳ đơn giản
- endpoint trả markers để đặt event như earnings, breakout, signal trên price chart

Khuyến nghị:

- price chart dùng TradingView
- valuation chart có thể dùng TradingView line series hoặc chart library riêng
- backend không nên khóa cứng valuation data vào format độc quyền của TradingView

## Logic Chỉ Báo Và Tín Hiệu

### Indicator Set Cốt Lõi
- `EMA(6)`
- `EMA(20)`
- `RSI(14)`
- `MACD(12,26,9)`
- `SMA(20)`
- `SMA(50)`
- `SMA_VOLUME(20)`

### Buy / Sell Signals

#### 1. EMA Crossover
- **Buy**: `EMA(6)` cắt lên `EMA(20)`
- **Sell**: `EMA(6)` cắt xuống `EMA(20)`

#### 2. RSI
- **Buy candidate**: `RSI < 30`
- **Sell candidate**: `RSI > 70`

#### 3. MACD
- **Buy**: MACD line cắt lên signal line
- **Sell**: MACD line cắt xuống signal line

#### 4. Volume Spike
- **Spike** khi `current_volume > 1.5 * SMA_VOLUME(20)`
- Nếu đi kèm breakout giá, nâng mức mạnh của tín hiệu

#### 5. Composite Score
Tính điểm cho từng mã:

- EMA trend: `0-30`
- RSI state: `0-20`
- MACD momentum: `0-20`
- Volume spike: `0-20`
- Price breakout / pullback: `0-10`

Phân loại:
- `70-100`: strong buy
- `55-69`: buy watch
- `45-54`: neutral
- `30-44`: sell watch
- `<30`: strong sell

## Realtime Strategy

### Mục tiêu
- Đẩy quote mới và signal mới tới client với độ trễ thấp.
- Không phụ thuộc hoàn toàn vào stream đầu vào bên ngoài.

### Thiết kế

#### Mode A: Internal stream available
- Dùng 1 realtime worker trung tâm cho toàn hệ thống.
- Nhận trades / price updates từ internal stream hoặc normalized event bus.
- Chuẩn hóa về quote event nội bộ.
- Ghi `quote_realtime`.
- Trigger signal evaluation incremental.
- Publish qua Redis và WebSocket nội bộ.

#### Mode B: Không có stream phù hợp
- Poll quote / intraday từ ingestion jobs theo lịch.
- Ghi quote snapshot vào DB.
- Chạy signal engine theo chu kỳ.
- Push event mới đến client.

### Lưu ý quan trọng
- Phải có một realtime worker trung tâm để tránh trùng tính toán và trùng phát sự kiện.
- Không để từng client kích hoạt collector hay stream riêng.
- Tất cả client chỉ subscribe vào WebSocket nội bộ của hệ thống.

## Scheduler & Sync Jobs

### 1. `sync-daily`
- Đồng bộ daily OHLCV cuối ngày.
- Chuẩn hóa thành daily / adjusted series nội bộ.

### 2. `sync-intraday`
- Đồng bộ intraday cho watchlist hoặc danh sách mã trọng tâm.
- Interval ưu tiên: `5min`.

### 3. `sync-quote`
- Lấy quote snapshot mới nhất.
- Tần suất tùy chiến lược ingest và giờ thị trường.

### 4. `sync-fundamentals`
- Đồng bộ company overview định kỳ.
- Tần suất: hàng ngày hoặc hàng tuần.

### 5. `sync-technical`
- Tính hoặc đồng bộ technical indicators.

### 6. `signal-engine`
- Chạy sau mỗi batch quote / intraday update.
- Ghi `signal_events`.
- Push alert nếu vượt ngưỡng.

### 7. `sync-valuations`
- Kết hợp giá và fundamentals để tính `P/E`, `P/B`.
- Ghi vào `valuation_timeseries`.
- Đồng thời tính snapshot tổng hợp cho exchange / sector / market.

## Chiến Lược Clone Capability

### Mục tiêu
- Clone trải nghiệm API kiểu Alpha Vantage cho stock data, fundamentals và technicals.
- Clone trải nghiệm realtime kiểu Finnhub cho quotes, trades và stream events.
- Public API và dữ liệu lõi phải là tài sản nội bộ của hệ thống.

### Hướng triển khai
- Dùng tài liệu tham chiếu để thiết kế endpoint, payload shape và nhóm tính năng.
- Tự xây normalization layer, valuation engine, indicator engine, signal engine.
- Tự sở hữu schema, cache model, realtime model và symbol metadata model.
- Chỉ dùng source ingest như một tầng đầu vào, không để lộ ra contract public.

## Environment Variables

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/openstock
REDIS_URL=redis://localhost:6379
APP_TIMEZONE=Asia/Ho_Chi_Minh
MARKET_DEFAULT_EXCHANGE=HOSE

QUOTE_SYNC_INTERVAL_MS=60000
INTRADAY_SYNC_INTERVAL_MS=300000
SIGNAL_EVALUATION_INTERVAL_MS=60000
VALUATION_SYNC_INTERVAL_MS=86400000
```

## Triển Khai Theo Phase

### Phase 1: Foundation
- Tạo schema chuẩn hóa symbol và price storage
- Tạo ingestion contracts và normalization layer
- Implement stock routes cơ bản
- Lưu daily / weekly / monthly / quote
- Redis caching cho quote và ohlcv

### Phase 2: Fundamentals
- Đồng bộ company overview
- Tạo routes fundamentals
- Chuẩn hóa metrics cơ bản theo response nội bộ
- Lưu `fundamental_snapshots` theo năm / quý / TTM

### Phase 3: Technical
- Đồng bộ hoặc tính EMA, RSI, MACD, BBANDS
- Tạo routes technical
- Lưu indicator snapshots vào DB

### Phase 4: Valuation
- Tính `P/E`, `P/B` theo cổ phiếu
- Tính `P/E`, `P/B` theo scope tổng hợp
- Tạo valuation APIs và chart-ready responses
- Tạo valuation summary cho dashboard cổ phiếu

### Phase 5: Signals
- Implement rule engine
- Ghi signal events
- Tạo endpoints xem tín hiệu hiện tại và lịch sử

### Phase 6: Realtime
- Tạo realtime worker
- Nối internal stream nếu có
- Fallback polling / replay nếu cần
- Push signal tới client

### Phase 7: Vietnam Market Rules
- Trading sessions cho HOSE / HNX / UPCOM
- Price limits
- Reference price logic
- Exchange-aware symbol handling

### Phase 8: TradingView Integration Layer
- Hoàn thiện `tv/*` endpoints
- Tạo signal markers, earnings markers, valuation overlays nếu cần
- Kiểm thử trực tiếp với frontend TradingView

## MVP Nên Làm Trước

Nếu muốn ra phiên bản usable nhanh nhất, nên chốt MVP:

1. `symbols`, `stock_prices`, `quote_realtime`, `company_overview`, `signal_events`
2. `GET /stocks/:symbol/daily`
3. `GET /stocks/:symbol/quote`
4. `GET /fundamentals/:symbol/overview`
5. `GET /technical/:symbol/rsi`
6. `GET /valuation/:symbol/current`
7. `GET /signals/:symbol/latest`
8. Signal rules:
   - EMA crossover
   - RSI
   - volume spike

## Kết Luận
Plan tốt nhất cho `stock_api` với định hướng clone hoàn toàn là:

- dùng Alpha Vantage và Finnhub như tài liệu tham chiếu capability, không dùng làm provider bắt buộc
- tự xây data model, valuation model, indicator model và signal model nội bộ
- chuẩn hóa toàn bộ symbol, exchange, market rules theo logic nội bộ cho thị trường Việt Nam
- dùng PostgreSQL làm nguồn dữ liệu chuẩn
- dùng Redis cho cache, pub/sub và coordination
- dùng Elysia WebSocket để phát quote và signal tới client

Hướng này giúp hệ thống thật sự trở thành một sản phẩm độc lập, có thể tái tạo trải nghiệm stock API hiện đại cho chứng khoán Việt Nam mà không bị khóa vào Alpha Vantage hay Finnhub.
