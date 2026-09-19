/**
 * src/utils/media.js
 *
 * All product/homepage/blog media in SCENTISTO is a Google Drive
 * link pasted by the Admin (Section 24 / 46 of the CMS spec).
 * This module is the single place that:
 * 1. Validates a submitted URL is well-formed and safe to store.
 * 2. Detects whether a link is an image or a video.
 * 3. Rewrites a Drive "share" link into a directly-embeddable
 * URL for <img>/<video>/<iframe> use on the storefront.
 *
 * SSRF NOTE: when media_type is "auto" and the extension alone
 * doesn't tell us image vs. video, the only way to be sure is to
 * ask the remote server (a HEAD request for its Content-Type).
 * Because the URL is admin-supplied, we restrict that outbound
 * request to a small allow-list of known media hosts (Google
 * Drive/Google User Content). We never issue a server-side
 * request to an arbitrary attacker-controlled host - for any
 * other host we fall back to extension-based detection and, if
 * that's inconclusive too, ask the Admin to set the type
 * explicitly instead of silently guessing.
 */
const https = require("https");

const ALLOWED_PROBE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
]);

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".avi"];

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function extractDriveFileId(url) {
  // Matches both share-link shapes:
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // https://drive.google.com/open?id=FILE_ID
  const pathMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return null;
}

function isGoogleDriveLink(url) {
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}

/**
 * Rewrites a Google Drive "share" URL into a URL that can be used
 * directly as an <img src> / <video src>. Falls back to the
 * original URL for anything that isn't a recognized Drive share
 * link (e.g. the admin already pasted a direct CDN URL).
 */
/** Default width requested from Google's image CDN when no size is given. */
const DEFAULT_IMAGE_WIDTH = 1200;

/**
 * Google's own image CDN endpoint for a Drive file.
 *
 * This replaces `drive.google.com/uc?export=view&id=...`, which was
 * what this function produced before, and which is the single worst
 * part of the old media path in production:
 *   - it is served by drive.google.com, not a CDN edge, so every
 *     visitor pays a round-trip to Google's origin;
 *   - it is aggressively rate-limited and, past a threshold, returns
 *     an HTML "can't scan for viruses" interstitial instead of image
 *     bytes - which renders as a broken <img>;
 *   - it always returns the FULL original upload. A 4 MB product
 *     photo is downloaded in full to fill a 180px-wide card.
 *
 * lh3.googleusercontent.com/d/<id> is the same file served from
 * Google's image CDN, and it accepts size options appended after
 * "=": `=w400` (fit to width), `=w400-h500-c` (crop). That gives us
 * genuinely responsive images and srcset without migrating a single
 * asset off Drive.
 */
function driveImageUrl(fileId, width = DEFAULT_IMAGE_WIDTH) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${Math.round(width)}`;
}

function toEmbeddableUrl(url, mediaType) {
  if (!isGoogleDriveLink(url)) return url;
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;

  if (mediaType === "video" || mediaType === "360") {
    // Drive doesn't serve raw video bytes for a direct <video src>;
    // /preview is the supported embeddable form (an <iframe>). The
    // storefront must therefore mount this lazily - see the
    // frontend's media util and ProductCard.
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return driveImageUrl(fileId, DEFAULT_IMAGE_WIDTH);
}

/**
 * Poster frame for a Drive-hosted video, so a product card can show
 * a still image instead of mounting a Drive player iframe. Drive
 * exposes generated thumbnails at the /thumbnail endpoint.
 */
function driveVideoPosterUrl(url, width = 640) {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${Math.round(width)}`;
}

function detectTypeFromExtension(url) {
  const clean = url.split("?")[0].toLowerCase();
  if (IMAGE_EXTENSIONS.some((ext) => clean.endsWith(ext))) return "image";
  if (VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext))) return "video";
  return null;
}

function isAllowedProbeHost(url) {
  try {
    const { hostname } = new URL(url);
    return [...ALLOWED_PROBE_HOSTS].some(
      (h) => hostname === h || hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

/**
 * Best-effort Content-Type probe, restricted to the allow-list.
 * Always resolves (never rejects) - worst case it resolves null,
 * meaning "couldn't determine, ask the admin to set it explicitly."
 * 3s timeout so a slow/unreachable host never hangs a request.
 */
function probeContentType(url) {
  return new Promise((resolve) => {
    if (!isAllowedProbeHost(url)) return resolve(null);
    const req = https.request(url, { method: "HEAD", timeout: 3000 }, (res) => {
      const contentType = res.headers["content-type"] || "";
      if (contentType.startsWith("image/")) resolve("image");
      else if (contentType.startsWith("video/")) resolve("video");
      else resolve(null);
      res.resume();
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

/**
 * Resolves the effective media type for a stored media URL.
 * - declaredType 'image' or 'video' -> trusted as-is (Admin chose explicitly).
 * - declaredType 'auto' / undefined -> try file extension, then a
 * restricted HEAD probe, else default to 'image' with `uncertain: true`
 * so the Admin UI can flag it for manual confirmation instead of
 * silently guessing wrong.
 */
async function resolveMediaType(url, declaredType) {
  if (declaredType === "image" || declaredType === "video") {
    return { type: declaredType, uncertain: false };
  }

  const fromExtension = detectTypeFromExtension(url);
  if (fromExtension) return { type: fromExtension, uncertain: false };

  const fromProbe = await probeContentType(url);
  if (fromProbe) return { type: fromProbe, uncertain: false };

  return { type: "image", uncertain: true };
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

module.exports = {
  isValidHttpUrl,
  driveImageUrl,
  driveVideoPosterUrl,
  DEFAULT_IMAGE_WIDTH,
  isGoogleDriveLink,
  extractDriveFileId,
  toEmbeddableUrl,
  detectTypeFromExtension,
  resolveMediaType,
  slugify,
};
