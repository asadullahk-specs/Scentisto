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

  useEffect(() => {
    publicHomepageApi
      .get()
      .then((data) => setSections(data.sections))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      {!loading && sections.length === 0 && (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center text-sm text-ink/40">
          No homepage sections configured yet - add some from Admin → Homepage
          CMS.
        </div>
      )}

      {sections.map((section) => (
        <HomeSection key={section.id} section={section} />
      ))}

      <Footer />
    </div>
  );
}
