# Deploying Pigment Connect

This app runs as a **single web service**: the Express backend serves the built
React frontend and the JSON API together under one domain. Data is stored in
**SQLite on a persistent disk**, so it survives restarts and redeploys.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Render Web Service (Node)                    │
│                                               │
│   Express  ──┬── /api/*   → JSON API           │
│              └── /*       → React SPA (static) │
│                                               │
│   SQLite DB + JWT secret → /data (disk)        │
└─────────────────────────────────────────────┘
```

## Deploy to Render (Blueprint)

1. Push this repo to GitHub/GitLab.
2. In Render: **New → Blueprint**, point it at the repo. Render reads
   [`render.yaml`](render.yaml) and provisions:
   - a Node web service (build: `npm run build`, start: `npm start`)
   - a 1 GB persistent disk mounted at `/data`
   - a generated `JWT_SECRET`
   - `DATA_DIR=/data` so the DB and secret live on the disk
3. Click **Apply**. First build installs both `server` and `client` deps,
   builds the frontend, and boots the server.
4. Visit the service URL. Health check: `https://<your-app>.onrender.com/api/health`.

> The `starter` plan is required because persistent disks aren't available on
> the free plan. Without a disk, SQLite data is wiped on every redeploy.

## Environment variables

| Variable      | Purpose                                  | Set by             |
|---------------|------------------------------------------|--------------------|
| `DATA_DIR`    | Where SQLite DB + JWT secret are stored  | `render.yaml` → `/data` |
| `JWT_SECRET`  | Signs auth tokens                        | `render.yaml` (generated) |
| `PORT`        | Port the server listens on               | Render (injected)  |
| `NODE_VERSION`| Node runtime version                     | `render.yaml` → 20 |

If `JWT_SECRET` is unset, the server generates one and persists it to
`DATA_DIR/.jwt-secret`. Setting it explicitly (as the blueprint does) is
preferred so it's managed by the platform.

## Local development

Two terminals:

```bash
# Terminal 1 — API on :3001
npm run dev:server

# Terminal 2 — Vite dev server on :5173 (proxies /api → :3001)
npm run dev:client
```

Open http://localhost:5173. The Vite proxy ([client/vite.config.js](client/vite.config.js))
forwards `/api` to the backend, so the same relative API base works in dev and prod.

## Test the production build locally

```bash
npm run build                       # installs deps + builds the client
DATA_DIR=./data npm start           # serves SPA + API on :3001
# open http://localhost:3001
```

## Other hosts

The same single-service setup runs anywhere that gives you a Node runtime and a
persistent filesystem (Railway volume, Fly.io volume, a VPS, etc.). Just set
`DATA_DIR` to a writable persistent path and run `npm run build && npm start`.
For purely serverless hosts (Vercel/Netlify functions) you'd first need to move
SQLite to a managed database — the cron scheduler and local file storage assume
a long-lived process.
