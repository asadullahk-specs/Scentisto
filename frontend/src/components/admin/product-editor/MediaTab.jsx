import { useState } from "react";
import MediaUrlField from "../MediaUrlField";
import { adminProductsApi } from "../../../api/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

/**
 * Frontend behaviour this data drives (public master prompt, Section 12):
 *  - primaryMediaType 'image' -> card shows primaryMediaUrl, swaps to
 *    hoverImageUrl on hover.
 *  - primaryMediaType 'video' -> card autoplays primaryMediaUrl, swaps
 *    to hoverImageUrl on hover.
 * Both are Admin-selected here; the gallery below is the unlimited
 * PDP image/video/360 set (Section 13).
 */
export default function MediaTab({
  productId,
  form,
  setForm,
  media,
  reloadMedia,
  onSavePrimary,
  saving,
}) {
  const { token } = useAdminAuth();
  const [newMedia, setNewMedia] = useState({
    url: "",
    mediaType: "auto",
    altText: "",
  });
  const [adding, setAdding] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleAddMedia() {
    if (!newMedia.url) return;
    setAdding(true);
    try {
      await adminProductsApi.createMedia(token, productId, newMedia);
      setNewMedia({ url: "", mediaType: "auto", altText: "" });
      reloadMedia();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMedia(mediaId) {
    await adminProductsApi.removeMedia(token, productId, mediaId);
    reloadMedia();
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm uppercase tracking-luxury text-ink/60 mb-4">
          Primary Media
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <MediaUrlField
            label="Primary Media URL (image or video)"
            url={form.primaryMediaUrl}
            mediaType={form.primaryMediaType}
            onUrlChange={(url) =>
              setForm((f) => ({ ...f, primaryMediaUrl: url }))
            }
            onTypeChange={(t) =>
              setForm((f) => ({ ...f, primaryMediaType: t }))
            }
            hint="Auto-detect works for direct file links; set explicitly for ambiguous Drive links."
          />
          <MediaUrlField
            label="Hover Image (shown on card/PDP hover)"
            url={form.hoverImageUrl}
            mediaType="image"
            onUrlChange={(url) =>
              setForm((f) => ({ ...f, hoverImageUrl: url }))
            }
          />
        </div>
        <button
          className="admin-btn mt-4"
          onClick={onSavePrimary}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Primary Media"}
        </button>
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-luxury text-ink/60 mb-4">
          Gallery
        </h3>
        {!productId ? (
          <p className="text-sm text-ink/40">
            Save the product first to add gallery media.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {media.map((m) => (
                <div key={m.id} className="admin-card p-3">
                  <div className="w-full h-28 bg-surface border border-border overflow-hidden mb-2">
                    {m.mediaType === "video" ? (
                      <iframe
                        src={m.url}
                        title={m.altText || "media"}
                        className="w-full h-full"
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt={m.altText || ""}
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    )}
                  </div>
                  <div className="text-xs text-ink/50 uppercase mb-2">
                    {m.mediaType}
                  </div>
                  <button
                    className="text-xs text-ink/50 hover:text-ink hover:underline"
                    onClick={() => handleRemoveMedia(m.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <MediaUrlField
                  url={newMedia.url}
                  mediaType={newMedia.mediaType}
                  onUrlChange={(url) => setNewMedia((m) => ({ ...m, url }))}
                  onTypeChange={(t) =>
                    setNewMedia((m) => ({ ...m, mediaType: t }))
                  }
                />
                <div>
                  <label className="admin-label">Alt Text</label>
                  <input
                    className="admin-input"
                    value={newMedia.altText}
                    onChange={(e) =>
                      setNewMedia((m) => ({ ...m, altText: e.target.value }))
                    }
                  />
                </div>
              </div>
              <button
                className="admin-btn-outline"
                onClick={handleAddMedia}
                disabled={adding || !newMedia.url}
              >
                {adding ? "Adding..." : "Add to Gallery"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
