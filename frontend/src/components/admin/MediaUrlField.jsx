/**
 * MediaUrlField
 * The Admin CMS never uploads files - every image/video is a
 * pasted Google Drive (or other https) link, per Section 24/46 of
 * the CMS spec. This field lets the Admin paste a URL, choose
 * Image / Video / Auto-detect, and see a live preview so a bad
 * link is caught before saving rather than discovered on the
 * storefront.
 */
export default function MediaUrlField({
  label,
  url,
  mediaType,
  onUrlChange,
  onTypeChange,
  hint,
}) {
  const isLikelyValid = !url || /^https?:\/\//i.test(url);

  return (
    <div>
      {label && <label className="admin-label">{label}</label>}
      <div className="flex gap-2">
        <input
          type="text"
          className="admin-input flex-1"
          placeholder="https://drive.google.com/file/d/.../view"
          value={url || ""}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        {onTypeChange && (
          <select
            className="admin-input w-32"
            value={mediaType || "auto"}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="auto">Auto-detect</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        )}
      </div>
      {!isLikelyValid && (
        <p className="text-xs text-ink/50 mt-1">
          Link should start with http:// or https://
        </p>
      )}
      {hint && <p className="text-xs text-ink/40 mt-1">{hint}</p>}

      {url && isLikelyValid && (
        <div className="mt-2 border border-border w-40 h-40 flex items-center justify-center overflow-hidden bg-surface">
          {mediaType === "video" ? (
            <iframe
              src={url}
              title={label || "media preview"}
              className="w-full h-full"
              allow="autoplay"
            />
          ) : (
            <img
              src={url}
              alt={label || "media preview"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
