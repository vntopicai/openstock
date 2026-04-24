# 📈 Vietnam Stock API (Bun + Elysia + Drizzle + Redis)

## 🚀 Quick Start
1. Copy `.env.example` to `.env` and update DB/Redis URLs
2. Install dependencies: `bun install`
3. Migrate DB: `bun run db:migrate`
4. Seed data: `bun run seed && bun run seed:fundamentals`
5. Start server: `bun run dev`

## 📡 API Endpoints
- `GET /api/v1/search?q=FPT`
- `GET /api/v1/stock/time-series?symbol=FPT&outputsize=compact`
- `GET /api/v1/stock/quote?symbol=FPT`
- `GET /api/v1/technical/FPT/indicators`
- `GET /api/v1/signals/FPT`
- `GET /api/v1/fundamentals/FPT/overview`
- `GET /api/v1/fundamentals/FPT/valuation?days=90`
- `GET /api/v1/signals/advanced/FPT`
- `WS /ws?token=demo-key-123`

## 🛠 Tech Stack
Bun, Elysia, Drizzle ORM, PostgreSQL, Redis, Zod, TypeScript
