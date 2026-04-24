-- setup-timescale.sql
-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert stock_prices to hypertable
SELECT create_hypertable('stock_prices', 'time', chunk_time_interval => INTERVAL '7 days');

-- Convert technical_indicators to hypertable
SELECT create_hypertable('technical_indicators', 'time', chunk_time_interval => INTERVAL '7 days');

-- Backfill data from legacy ohlcv_daily
INSERT INTO stock_prices (symbol, interval, time, open, high, low, close, volume, source)
SELECT 
    symbol, 
    '1d', 
    date as time, 
    open, 
    high, 
    low, 
    close, 
    volume, 
    'legacy' 
FROM ohlcv_daily
ON CONFLICT DO NOTHING;

-- Optional: Add compression policy for older data
-- ALTER TABLE stock_prices SET (timescaledb.compress, timescaledb.compress_segmentby = 'symbol');
-- SELECT add_compression_policy('stock_prices', INTERVAL '30 days');
