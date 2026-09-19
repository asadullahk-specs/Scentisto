# SCENTISTO — Deployment Notes

## 1. Rotate the leaked credentials (do this first)

`backend/.env` was committed to the repository with live values for:

- `MONGODB_URI` (including the Atlas username and password)
- `JWT_ACCESS_SECRET`
- `COOKIE_SECRET`

A comment inside the file also records that the Atlas password was
shared in a chat log. Treat all three as compromised:

1. Atlas → Database Access → edit the user → autogenerate a new password.
2. Generate a new `JWT_ACCESS_SECRET` and `COOKIE_SECRET`
   (`openssl rand -hex 48`). Rotating the JWT secret invalidates every
   issued token, which is harmless here: sessions are memory-only and
   already end on refresh by design.
3. Remove the file from git history (`git filter-repo --path
   backend/.env --invert-paths`, or BFG) and force-push. `.gitignore`
   already covers the path, but ignoring a file does not untrack it.
4. Set the real values as Vercel environment variables instead.

## 2. Required Vercel environment variables

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas SRV string, including the database name |
| `JWT_ACCESS_SECRET` | 64+ random chars |
| `COOKIE_SECRET` | 32+ random chars |
| `NODE_ENV` | `production` — also switches off Mongoose autoIndex |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_ISSUER` | optional, have defaults |
| `FREE_SHIPPING_THRESHOLD`, `FLAT_SHIPPING_COST` | see known issue below |
| `CLIENT_ORIGIN` / `PUBLIC_SITE_ORIGIN` | only if the site is served from a different origin than the API |

**Do not set `VITE_API_BASE_URL`.** The frontend calls the relative
path `/api`, which `vercel.json` rewrites to the serverless function.
A committed `frontend/.env` containing
`VITE_API_BASE_URL=http://localhost:5000/api` was the cause of the
production outage: Vite inlines that value at build time, so the
deployed bundle asked each visitor's own machine for the API. That
file has been deleted and `apiClient` now refuses a localhost base in
a production build.

## 3. Build indexes after deploying

Mongoose `autoIndex` is disabled in production on purpose (building
indexes on every cold start is a production anti-pattern, and the
serverless entry was previously doing exactly that). Index definitions
in the schema files do **not** create indexes in Atlas by themselves.
Run once per schema change, with production credentials:

```bash
cd backend && MONGODB_URI="<atlas uri>" npm run db:sync-indexes
```

Until this is run, `$text` product search will fail outright (a text
query with no text index is an error, not a slow query) and the new
listing indexes will not exist.

## 4. Known issues still outstanding

- **`bcrypt` is a native module.** It needs a prebuilt binary matching
  Vercel's Node version. If the function fails to boot with a
  `node-gyp` / `bindings` error, switch to `bcryptjs`, which is a drop-in
  for the hashing API used here and accepts existing hashes.
- **Shipping constants are duplicated.** `Checkout.jsx` hardcodes the
  free-shipping threshold and flat cost, which the backend reads from
  environment variables. The server recomputes the authoritative total
  at order creation so no customer is mischarged, and the UI now
  labels the figure "Estimated Total" — but the two can disagree until
  the API publishes these values.
- **`presenceTracker` is per-process, in-memory.** On serverless each
  instance keeps its own count, so "N people viewing" is a per-instance
  number, not a global one. Correct behaviour needs shared storage.
