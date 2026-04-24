# OpenStock

OpenStock is an AI-first open-source stock intelligence platform for research, analysis, and decision support.

## Overview

OpenStock combines:

- Market data ingestion  
- Fundamental and technical analysis  
- AI-powered research workflows  
- Signal discovery and screening  
- Agent-driven investment insights  
- Interactive stock dashboards  

The goal is to build an open-source AI copilot for equity research.

---

## Features

### AI Research Engine
- LLM-powered stock analysis
- Earnings and financial statement interpretation
- AI-generated research reports
- Retrieval-Augmented Generation (RAG) for market knowledge

### Market Intelligence
- Fundamental metrics analysis
- Technical indicators
- Sector and macro trend signals
- Watchlists and screening

### Agent Workflows
- Research agents
- Signal monitoring agents
- Thesis-building agents
- Decision support pipelines

### Dashboards
- Single-stock intelligence dashboards
- Multi-factor scoring
- Opportunity monitoring
- Scenario analysis

---

## Architecture

OpenStock follows a layered architecture:

```text
Data Sources
├── Market Data APIs
├── Financial Statements
├── News & Alternative Data
└── Economic Data

Data Layer
├── Storage
├── Search / Vector Retrieval
└── Knowledge Layer

AI Layer
├── RAG Engine
├── LLM Reasoning
├── Agents
└── Signal Models

Application Layer
├── Dashboards
├── Research Workspace
└── Decision Support
```

---

## Tech Stack

Planned / Current Stack:

- Bun
- Elysia or Hono
- TypeScript
- PostgreSQL
- Elasticsearch
- OpenSearch
- Vector Database
- LLM APIs / Open Models

---

## Use Cases

OpenStock supports:

- Equity research
- Fundamental analysis
- Signal discovery
- Investment thesis building
- Portfolio monitoring
- AI-assisted decision support

---

## Vision

Build the open-source AI operating system for stock research.

---

## Roadmap

### Phase 1
- Core data ingestion
- Stock dashboards
- Basic screening
- AI research summaries

### Phase 2
- RAG knowledge layer
- Agent workflows
- Signal intelligence
- Thesis generation

### Phase 3
- Multi-agent investment copilot
- Strategy simulations
- Portfolio intelligence
- Autonomous research pipelines

---

## Installation

```bash
git clone https://github.com/vntopicai/openstock

cd openstock

bun install

bun dev
```

---

## Contributing

Contributions are welcome.

- Open issues
- Suggest features
- Submit pull requests

---

## License

MIT