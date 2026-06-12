# Pigment Connect

A web app that lets non-technical users build API integrations from upstream
systems — **Workday, SAP BDC, Oracle, and Snowflake** — into
[Pigment](https://www.pigment.com/), with a built-in data staging and
transformation layer.

Pick a source system, enter the connection details, import the data, shape it
with spreadsheet-style formulas, and schedule it to flow into Pigment — no code
required.

---

## Features

- **Guided integration builder** — a step-by-step wizard for each source system
  with the right connection fields, secrets masking, and validation.
- **Multi-project workspaces** — organize integrations by team, workflow, or
  data domain. Each user's projects, integrations, and data are fully sandboxed.
- **Scheduling** — run integrations on a cron schedule (hourly → monthly) with
  pause/resume and full run history.
- **Data import & grid viewer** — pull source data into a staged table and view
  it in a spreadsheet-style grid.
- **CSV upload** — load flat files directly as a data source (RFC 4180 parser
  with type inference).
- **Excel-like transformations** — add computed columns with formulas like
  `IF([Region]="EMEA", ROUND([Revenue]*1.1, 2), [Revenue])`. Functions include
  `IF`, `CONCAT`, `ROUND`, `UPPER`, `SUBSTITUTE`, and more, with live preview
  and validation.
- **Database-style column formats** — set per-column types (Text, Integer,
  Decimal, Currency, Percent, Date, Boolean) like in Snowflake. Non-destructive
  formatting metadata.
- **Output tables → Pigment** — saved transformed tables can be referenced as
  the data source for an integration, so the cleaned data is what flows to
  Pigment.
- **Light / dark theme**, persisted per browser.

## Tech stack

| Layer    | Stack                                              |
|----------|----------------------------------------------------|
| Frontend | React 19, Vite, Tailwind CSS                       |
| Backend  | Node, Express 5                                    |
| Database | SQLite (`better-sqlite3`)                          |
| Auth     | JWT (bcrypt-hashed passwords)                      |
| Jobs     | `node-cron`                                        |

## Project structure

```
pigment-integrations/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/      # Sidebar, IntegrationForm, DataTablesView, …
│       ├── lib/             # formulaEngine, csvParser, columnTypes
│       └── pages/           # AuthPage, Dashboard
├── server/                 # Express API
│   ├── index.js            # routes + static frontend serving
│   ├── db.js               # SQLite schema
│   ├── auth.js             # JWT
│   ├── scheduler.js        # node-cron runner
│   └── sampleData.js       # simulated source extracts
├── render.yaml             # Render deployment blueprint
└── DEPLOY.md               # deployment guide
```

## Local development

Requires **Node 20+**.

```bash
# Install dependencies (both server and client)
npm run install:all

# Terminal 1 — API on :3001
npm run dev:server

# Terminal 2 — Vite dev server on :5173 (proxies /api → :3001)
npm run dev:client
```

Open **http://localhost:5173** and create an account.

## Production build

```bash
npm run build                 # installs deps + builds the client
DATA_DIR=./data npm start     # Express serves SPA + API on :3001
```

## Deployment

Configured for **single-service deployment on Render** (Express serves the built
React app and the API together; SQLite lives on a persistent disk). See
[DEPLOY.md](DEPLOY.md) for the full guide.

## Security model

Every API endpoint is scoped to the authenticated user — projects, integrations,
data tables, run history, and schedules are all isolated per account. A user can
only ever see or modify resources inside projects they own; cross-tenant ID
access, table-reference injection, and unauthenticated requests are all rejected
server-side.

> **Note:** source-system extraction is currently simulated with realistic
> sample data (see [`server/sampleData.js`](server/sampleData.js)). The
> connection forms, scheduling, staging, transformation, and Pigment-delivery
> flows are fully built; wiring the live source/Pigment API calls is the
> remaining integration step.
