# SCENTISTO - Phase 0 Security Notes

This documents the concrete defenses built into the auth system, mapped to
the requirement: *"apply all powerful and working attempts to reduce
threats of data theft"* and *"on page refresh, the user or admin panel
should logout."*

## 1. Session model - memory-only tokens (the refresh-logout requirement)
The access token is returned once, in the login response body, and the
frontend keeps it **only in a React `useState`** (`context/createAuthContext.jsx`).
It is never written to `localStorage`, `sessionStorage`, or a cookie.

Consequences, both intentional:
- A page refresh (or new tab) clears JS memory → instant logout, on both
 the storefront and the Admin CMS, exactly as required.
- There is nothing in persistent browser storage for an XSS payload to
 steal, and no auth cookie for a CSRF attack to ride on - this removes
 the two most common token-theft vectors by construction, not by policy.

The token itself is short-lived (`JWT_ACCESS_EXPIRES_IN`, default 15 min),
so even a token captured mid-session (e.g. via a compromised network) has
a small blast radius.

## 2. Password storage
Passwords are hashed with **bcrypt** (`BCRYPT_SALT_ROUNDS`, default 12) - 
plain text is never stored, logged, or returned by any endpoint.
`utils/password.js` is the only module allowed to touch a raw password.

## 3. Password policy
Enforced server-side (`validatePasswordStrength`) and mirrored live in the
Register UI: minimum length, upper+lowercase, number, symbol, and a
common-password blocklist. Client-side feedback is UX only - the server
is the source of truth and rejects weak passwords regardless of what the
client sends.

## 4. Brute-force defense (two independent layers)
- **Per-account lockout**: after `MAX_FAILED_LOGIN_ATTEMPTS` (default 5)
 consecutive failures, the account is locked for `LOCKOUT_DURATION_MINUTES`
 (default 15). Resets on a successful login.
- **Per-IP rate limiting** (`express-rate-limit`): caps login attempts per
 IP address independently of which account is targeted.

Because the two are independent, an attacker can't defeat lockout by
rotating IPs against one account, or defeat rate limiting by spraying
many accounts from one IP.

## 5. Enumeration resistance
Login failures always return the same generic message
("Invalid email or password.") whether the email doesn't exist or the
password was wrong, so the API can't be used to discover which emails
are registered. Registration failures are similarly generic.

## 6. Admin/customer isolation
Customers and Admin CMS staff are both `User` documents but are
distinguished by a `scope` field (`storefront` vs `admin`) validated by
the Mongoose schema enum. `/auth/login` only accepts `storefront`-scope
accounts; `/auth/admin/login` only accepts `admin`-scope accounts - a
leaked customer password can never be used to reach the Admin CMS, and
the two auth flows use fully separate React contexts on the frontend so
their tokens can never mix in the same tab.

## 7. Transport & header hardening
- `helmet` sets HSTS, disables MIME sniffing, denies framing
 (`frameAncestors: 'none'`), and applies a restrictive default CSP.
- `cors` only allows the configured storefront/admin origins; all other
 origins are rejected at the middleware layer.
- `X-Powered-By` is disabled so the stack isn't fingerprinted for free.

## 8. Injection & payload defenses
- All data access goes through Mongoose schemas (`models/*.js`) - every
 write is cast and validated against its schema before it reaches
 MongoDB, and every query built with the query builder
 (`Model.find({ field: value })`) is parameterized by construction, the
 same way a `?` placeholder is in SQL.
- **NoSQL injection**: MongoDB's analogue of SQL injection is an
 attacker sending an operator object instead of a scalar - e.g.
 `{"email": {"$gt": ""}}` - to change a query's meaning.
 `express-mongo-sanitize` runs on every request and rewrites any key in
 `body`/`query`/`params` starting with `$` or containing `.` (e.g.
 `$gt` → `_gt`) before it reaches a controller, so a crafted payload
 can never be interpreted as a Mongo operator.
- `express-validator` validates and normalizes every input field before
 it reaches a controller, on top of Mongoose's own schema casting.
- `xss-clean` strips known XSS payloads from `body`/`query`/`params`.
- `hpp` blocks HTTP parameter pollution.
- JSON body size is capped at 100kb to blunt payload-based DoS.
- No `$where`, `mapReduce`, or other JavaScript-executing MongoDB
 operators are used anywhere in the codebase - those accept arbitrary
 JS and are a standing NoSQL-injection risk in their own right even
 with sanitized input.

## 9. Audit trail
Every login attempt - success or failure, with reason, IP, and user
agent - is written via `LoginHistory` (`models/LoginHistory.js`).
Register/login/logout events are also written via `ActivityLog`
(`models/ActivityLog.js`), the same collection later phases (Section 41
of the CMS spec) extend for product/order/settings changes. This gives
the Admin "Login History" and "Activity Logs" panels real data from day
one instead of a mock.

## 10. Checkout gating
`/checkout` on the storefront is wrapped in `<ProtectedRoute>`
(`components/ProtectedRoute.jsx`), which redirects unauthenticated
visitors to `/login` before the checkout component ever mounts - there
is no code path that renders checkout for a guest.

## 11. MongoDB Atlas infrastructure hardening
These are configured on Atlas itself, not in application code - worth
checking explicitly since they're easy to leave on a permissive default:
- **Database user**: a dedicated user scoped to this project (not your
 personal Atlas login), with a generated password stored only in
 `.env` (never committed - see `.gitignore`).
- **Network Access allow-list**: restrict to known IPs (your app
 server's static IP / VPC peering in production). `0.0.0.0/0` is
 acceptable for local development only, and should be removed before
 go-live.
- **Least privilege**: the app's database user only needs
 read/write on the `scentisto` database - do not grant it Atlas
 project-owner or cluster-admin permissions.
- **Encryption**: Atlas encrypts data at rest by default and requires
 TLS in transit for the `mongodb+srv://` connection string - nothing
 extra to configure here, just don't downgrade to an unencrypted
 connection string.

## What Phase 0 deliberately defers
- Refresh tokens / "remember me" - out of scope by design (see §1).
- Two-factor authentication - flagged as optional in the CMS spec
 (Section 39); the `User` schema and JWT payload are structured so it
 can be added later without a breaking change.
- Full RBAC permission matrix (Section 40) - `role` is a validated enum
 on every user document now (`models/User.js`); the granular
 per-action permissions table lands with the Admin Users & Roles
 module.
