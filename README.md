# Internet Empire

Server-authoritative incremental tycoon. The browser requests actions (`click`, `buy`, `prestige`). The server owns money, traffic, upgrades, prestige, timestamps, and achievement grants.

## Stack

- Next.js 15 App Router + TypeScript
- Neon-compatible serverless Postgres (`@neondatabase/serverless`)
- JWT session cookie (`jose`, httpOnly)
- Game math uses scientific decimal strings to avoid `Infinity`

## Environment

Copy `.env.example` and set:

| Variable | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | yes | `openssl rand -base64 48` |
| `DATABASE_URL` | yes | Neon / Vercel Postgres connection string |
| `MAX_OFFLINE_HOURS` | no | Default `12`, cap `48` |

Schema is created automatically on first request.

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Security model

- No client-supplied money / income / timestamps are accepted.
- Optimistic locking via `game_states.version`.
- Purchase and click cooldowns are server timestamps.
- Optional idempotency keys on mutating routes.
- Passwords hashed with bcrypt.
- Large numbers stored as strings in JSON; engine rejects negatives / NaN.

This does not make cheating impossible. It prevents DevTools / localStorage / bookmarklets from *directly writing* authoritative resources.

## Deploy

Connect the GitHub repo to Vercel, add the env vars, deploy.
