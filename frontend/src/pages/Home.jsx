import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/public/Footer";
import HomeSection from "../components/public/HomeSection";
import { publicHomepageApi } from "../api/publicApi";

/**
 * The entire homepage body is Admin-driven (Section 26 of the CMS
 * spec) - this component fetches the ordered, enabled sections from
 * /api/homepage and renders whatever comes back via <HomeSection>,
 * rather than hardcoding "Best Sellers then New Arrivals then...".
 * Run `npm run db:seed-homepage` for a sensible starting layout;
 * everything after that is managed from /admin/homepage-cms.
 */
export default function Home() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicHomepageApi
      .get()
      .then((data) => {
        if (!cancelled) setSections(data.sections || []);
      })
      // There was no .catch here. If /api/homepage failed - which it
      // always did in production, because the bundle was calling
      // localhost - this produced an unhandled rejection and the
      // homepage rendered as a bare header and footer with no
      // explanation and no way to retry.
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <main className="flex-1">
        {loading && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center text-sm text-ink/40">
            Loading…
          </div>
        )}

        {!loading && error && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
            <p className="text-sm text-ink/60 mb-5">
              We couldn&apos;t load the homepage right now.
            </p>
            <p className="text-xs text-ink/40 mb-6">{error}</p>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && sections.length === 0 && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center text-sm text-ink/40">
            No homepage sections configured yet - add some from Admin → Homepage
            CMS.
          </div>
        )}

        {!error &&
          sections.map((section, index) => (
            <HomeSection
              key={section.id}
              section={section}
              isFirst={index === 0}
            />
          ))}
      </main>

      <Footer />
    </div>
  );
}
