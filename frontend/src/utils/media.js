/**
 * src/utils/media.js
 *
 * One place that turns whatever media URL is stored on a product,
 * homepage section or blog post into something the browser can load
 * quickly.
 *
 * Why this runs on the client instead of being a data migration:
 * media URLs already in MongoDB were written by the old backend as
 * `https://drive.google.com/uc?export=view&id=FILE_ID`. That form
 * hits Drive's origin (not a CDN), is rate-limited, and always
 * returns the full-size original - a multi-megabyte photo downloaded
 * to fill a 180px card. Normalising at render time upgrades every
 * existing record without touching the database, and new records
 * are already written in the good form by backend/src/utils/media.js.
 *
 * Anything that isn't a Google Drive link (an admin who pasted a
 * real CDN URL) is passed through untouched.
 */

const LH3_HOST = "lh3.googleusercontent.com";

/** Widths offered in a srcset. Kept short - more entries just bloat HTML. */
const SRCSET_WIDTHS = [320, 480, 768, 1024, 1600];

export function extractDriveFileId(url) {
  if (!url || typeof url !== "string") return null;
  // https://lh3.googleusercontent.com/d/FILE_ID=w800
  const lh3 = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3) return lh3[1];
  // https://drive.google.com/file/d/FILE_ID/view
  const path = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (path) return path[1];
  // https://drive.google.com/uc?export=view&id=FILE_ID  (the legacy form)
  // https://drive.google.com/thumbnail?id=FILE_ID
  const query = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (query) return query[1];
  return null;
}

function isGoogleMedia(url) {
  return (
    typeof url === "string" &&
    /(drive|docs)\.google\.com|lh3\.googleusercontent\.com/.test(url)
  );
}

/**
 * A Google-hosted image at a specific width, or the original URL for
 * anything we can't resize.
 */
export function imageUrl(url, width = 1024) {
  if (!url) return "";
  if (!isGoogleMedia(url)) return url;
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;
  return `https://${LH3_HOST}/d/${fileId}=w${Math.round(width)}`;
}

/**
 * srcset string for a responsive <img>, or null when the source
 * can't be resized (in which case the caller just omits the
 * attribute and the browser uses src).
 */
export function imageSrcSet(url, { maxWidth = 1600 } = {}) {
  if (!url || !isGoogleMedia(url)) return null;
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  const widths = SRCSET_WIDTHS.filter((w) => w <= maxWidth);
  if (widths.length === 0) return null;
  return widths
    .map((w) => `https://${LH3_HOST}/d/${fileId}=w${w} ${w}w`)
    .join(", ");
}

/**
 * Everything an <img> needs, ready to spread:
 *   <img {...imageProps(url, { width: 400, sizes: "50vw" })} alt="..." />
 *
 * `priority` marks the one above-the-fold LCP image on a page: it
 * loads eagerly with fetchpriority=high. Everything else is
 * lazy-loaded and decoded off the main thread.
 */
export function imageProps(
  url,
  { width = 1024, sizes, priority = false, maxWidth = 1600 } = {},
) {
  const srcSet = imageSrcSet(url, { maxWidth });
  return {
    src: imageUrl(url, width),
    ...(srcSet ? { srcSet, sizes: sizes || `${width}px` } : {}),
    loading: priority ? "eager" : "lazy",
    decoding: priority ? "sync" : "async",
    ...(priority ? { fetchpriority: "high" } : {}),
  };
}

/**
 * A still frame for a Drive-hosted video, so a product grid can show
 * an image instead of mounting a Drive player <iframe> per card.
 * Returns null when we can't derive one, and the caller falls back
 * to the product's own hover image.
 */
export function videoPosterUrl(url, width = 640) {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${Math.round(width)}`;
}

/** Embeddable player URL for a Drive video (mounted only on demand). */
export function videoEmbedUrl(url) {
  if (!url) return "";
  if (/\/preview(\?|$)/.test(url)) return url;
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
