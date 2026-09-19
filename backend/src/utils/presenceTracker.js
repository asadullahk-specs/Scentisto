/**
 * src/utils/presenceTracker.js
 *
 * Backs the "N people are viewing this right now" badge on the
 * product detail page. Deliberately in-memory and per-process, not
 * a Mongo collection - this is ephemeral, sub-minute-lived state
 * with no need to survive a restart or be queried across instances,
 * the same reasoning that already justifies memory-only JWTs
 * elsewhere in this app (SECURITY.md). If this app is ever run as
 * multiple Node processes behind a load balancer, this count becomes
 * per-instance rather than global - acceptable for a marketing
 * signal, not acceptable if it were driving inventory or security
 * decisions, which it never is.
 *
 * A viewer is "present" for PRESENCE_TTL_MS after their most recent
 * heartbeat; the frontend re-sends a heartbeat well inside that
 * window (see NotificationBell-style polling elsewhere) so a visitor
 * who's still on the page never silently drops out of the count.
 */
const PRESENCE_TTL_MS = 90 * 1000;

// productId (string) -> Map<sessionId, expiresAtEpochMs>
const presenceByProduct = new Map();

function sweep(productId) {
  const sessions = presenceByProduct.get(productId);
  if (!sessions) return null;
  const now = Date.now();
  for (const [sessionId, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(sessionId);
  }
  if (sessions.size === 0) {
    presenceByProduct.delete(productId);
    return null;
  }
  return sessions;
}

function heartbeat(productId, sessionId) {
  let sessions = presenceByProduct.get(productId);
  if (!sessions) {
    sessions = new Map();
    presenceByProduct.set(productId, sessions);
  }
  sessions.set(sessionId, Date.now() + PRESENCE_TTL_MS);
  sweep(productId);
  return sessions.size;
}

function countActive(productId) {
  const sessions = sweep(productId);
  return sessions ? sessions.size : 0;
}

module.exports = { heartbeat, countActive };
