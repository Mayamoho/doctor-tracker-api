# Doctor Tracker API

Express 5 + Mongoose 9 REST API behind the [Doctor Tracker portal](https://github.com/Mayamoho/doctor-tracker-web) — the full technical write-up (architecture, data flow, the two deep dives, screenshots) lives in that repository's README.

```
POST   /api/v1/auth/login          httpOnly access + refresh cookies
GET    /api/v1/doctors             search · filter · sort · paginate
GET    /api/v1/patients            same, across the whole register
GET    /api/v1/dashboard/stats     one $facet pass
```

## Setup

Requires Node `>= 20.19` and a MongoDB deployment (Atlas URI or local).

```bash
cp .env.example .env      # MONGO_URI + two distinct JWT secrets
npm install
npm run seed              # admin user + 45 doctors / 600 patients
npm run dev               # http://127.0.0.1:5000/api/v1
```

`GET /health` is intentionally cheap — no database call, no auth — so a cold instance can answer a platform health check before it can answer anything else.

| Script | |
|---|---|
| `npm run dev` | `tsx watch` |
| `npm run build` | `tsc` → `dist/` |
| `npm start` | `node dist/server.js` |
| `npm run seed` | reset + reseed (dev only; it drops the database) |
| `npm run indexes` | `explain()` report for every path the UI takes |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
src/
  app.ts                 helmet · CORS · rate limit · /health · /api/v1
  config/                env (zod-validated, exits on a bad config) · db
  routes/                guards: requireAuth + requireRole('admin')
  validation/            zod schemas — the only place a request becomes trusted
  controllers/           response shaping
  services/              queries, aggregations, pagination
  models/                Doctor · Patient · User
  middleware/            auth · validate · rateLimit · errorHandler
  utils/                 search tokens · cookies · tokens · pagination
  scripts/               seed · explainSearch
```

## What is worth reading

- **`utils/search.ts`** — search runs against a normalized `searchTerms` array with an anchored prefix match, not `$regex` over raw strings. `npm run indexes` prints why: the unanchored version of the same query reads 583 index keys and 45 documents to return two rows, and the case-insensitive anchored one returns nothing at all.
- **`utils/cookies.ts`** — the session is a 15-minute access token and a 7-day rotating refresh token, both in httpOnly `SameSite=Lax` cookies. No token is ever returned in a body or readable by JavaScript.
- **`utils/query.ts`** — every list route shares one parameter parser: `limit` capped at 100, sort tokens whitelisted against an enum, and an `_id` tiebreaker appended so a page boundary can never repeat or drop a row.
- **`services/doctorService.ts`** — a page of doctors gets its patient counts from one `$group`, not one query per row.
- **`config/env.ts`** — an invalid environment exits at boot rather than starting with an undefined secret.

## Security posture

| | |
|---|---|
| Transport | Cookies are `Secure` whenever `NODE_ENV=production`; `COOKIE_SECURE` overrides for a TLS-terminating proxy |
| Injection | Every parameter is parsed by zod before it reaches Mongo; `$regex` inputs are escaped |
| Brute force | `/auth/*` at 10 requests / 15 min (successful logins skipped), general API at 120 / minute, keyed on the real client IP behind exactly one trusted proxy hop |
| Enumeration | A wrong password and an unknown account answer identically |
| Errors | Mongoose duplicate keys → 409, zod issues → 400 with a per-field `issues` array, everything else → logged and answered with a generic 500 |
| Payload | Request bodies capped at 16 kB |

## Database

MongoDB Atlas. Indexes are declared on the models and synchronised at boot, so a fresh database is query-optimized before the first request:

```
searchTerms          doctor / patient free-text search
specialization_1_createdAt_-1__id_-1    filter + sort + page in one scan
doctorId_1_visitDate_-1__id_-1          one doctor's patients, newest first
visitDate_-1__id_-1                     date-wise ranges
```

Seeded data is synthetic: Bangladeshi names, districts and BMDC-style registration numbers. The seeded admin credentials in `.env.example` are development-only.
