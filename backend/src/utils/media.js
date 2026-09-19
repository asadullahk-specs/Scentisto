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
function toEmbeddableUrl(url, mediaType) {
  if (!isGoogleDriveLink(url)) return url;
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;

  if (mediaType === "video" || mediaType === "360") {
    // Drive doesn't serve raw video bytes reliably for direct <video src>;
    // the /preview endpoint is the supported embeddable form (used in an <iframe>).
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  // Image: uc?export=view serves the raw file, usable directly in <img src>.
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
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
  isGoogleDriveLink,
  extractDriveFileId,
  toEmbeddableUrl,
  detectTypeFromExtension,
  resolveMediaType,
  slugify,
};
