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
npm run seed              # admin user + 72 real doctors / 600 synthetic patients
npm run dev               # http://127.0.0.1:5000/api/v1
```

`GET /health` is intentionally cheap — no database call, no auth — so a cold instance can answer a platform health check before it can answer anything else.

| Script | |
|---|---|
| `npm run dev` | `tsx watch` |
| `npm run build` | `tsc` → `dist/` |
| `npm start` | `node dist/server.js` |
| `npm run seed` | reset + reseed (dev only; it drops the database) |
| `npm run rotate:admin` | set a new admin password from `ADMIN_PASSWORD` without touching any other collection |
| `npm run indexes` | `explain()` report for every list path, including the two queries this design rejects |
| `npm run typecheck` | `tsc --noEmit` |

### Deploying

This service goes on Render (build `npm ci --include=dev && npm run build`, start `npm start`, health check path `/health`); the portal that rewrites to it goes on Vercel. `PORT` comes from the platform, and `COOKIE_SECURE` need not be set — it defaults to `true` under `NODE_ENV=production`.

Two things that bite here. Render exports `NODE_ENV=production`, which makes npm set `omit=dev`, so a plain `npm ci` installs no devDependencies — `typescript` is one of them, and `npm run build` then fails at `tsc: not found`. Hence `--include=dev`. And Atlas Network Access must accept the service's egress address, which on the free tier is dynamic, so it cannot be allowlisted by IP.

Full procedure, including why the cookies stay host-only and what breaks if you add a `Domain`: [doctor-tracker-web ▸ Deployment](https://github.com/Mayamoho/doctor-tracker-web#deployment).

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
  data/                  doctorDirectory.ts (sourced) · clinicalReference.ts (reference tables)
  middleware/            auth · validate · rateLimit · errorHandler
  utils/                 search tokens · cookies · tokens · pagination
  scripts/               seed · explainSearch · rotateAdminPassword
```

## What is worth reading

- **`utils/search.ts`** — search runs against a normalized `searchTerms` array with an anchored prefix match, not `$regex` over raw strings. `npm run indexes` prints why: the unanchored version of the same query reads 593 index keys and 72 documents to return four rows, and the case-insensitive anchored one reads the whole `name` index and returns nothing at all.
- **`utils/cookies.ts`** — the session is a 15-minute access token and a 7-day refresh token, both in httpOnly `SameSite=Lax` cookies. No token is ever returned in a body or readable by JavaScript.
- **`services/authService.ts`** — refresh does *not* rotate. Each user carries a `tokenVersion` that is embedded in both tokens and compared on every refresh; it moves only when the user logs out, which revokes every outstanding session at once. Per-refresh rotation would make refresh tokens single-use and break the first two tabs that expire together.
- **`utils/query.ts`** — every list route shares one parameter parser: `limit` capped at 100, sort tokens whitelisted against an enum, date bounds rejected unless they are real calendar days, and an `_id` tiebreaker appended so a page boundary can never repeat or drop a row.
- **`services/doctorService.ts`** — a page of doctors gets its patient counts from one `$group`, not one query per row.
- **`config/env.ts`** — an invalid environment exits at boot rather than starting with an undefined secret, and production refuses to start on the default `ADMIN_PASSWORD`.

## Where the seed data comes from

`npm run seed` writes two different kinds of row, and the difference is deliberate. [Provenance is written up in the portal README](https://github.com/Mayamoho/doctor-tracker-web#where-the-data-comes-from); the short version:

- **72 doctors are real.** `data/doctorDirectory.ts` holds names, degrees, BMDC registration numbers, specialization and institution copied from public Bangladeshi doctor directories, with the source recorded per row. Their `phone` and `email` are the literal string `not published` — those numbers belong to real people and are not reprinted here, and inventing one against a real name would be worse than omitting it.
- **600 patients are synthetic.** No lawful source of Bangladeshi patient records exists, so the identities are generated. Everything *around* them is reference data: district names and divisions from the DGHS facility registry, condition names with their ICD-10 codes, a per-specialty condition catalogue, and seasonal visit curves.
- **`experienceYears` is an estimate**, derived from BMDC registration order (the register issues numbers sequentially, so a lower number is an earlier licence). It is the only doctor field that is not copied from a source.

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
searchTerms                              doctor / patient free-text search
specialization_1_createdAt_-1__id_-1     filter + sort + page in one scan
gender_1_createdAt_-1__id_-1             the patient gender filter
experienceYears_-1__id_-1                "most experienced" without a collection scan
doctorId_1_visitDate_-1__id_-1           one doctor's patients, newest first
visitDate_-1__id_-1                      date-wise ranges
```

The seeded admin credentials in `.env.example` are development-only, and `config/env.ts` refuses to boot a production process that still uses them.
