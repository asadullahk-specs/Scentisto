import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import { imageProps } from "../../utils/media";

/**
 * @param {boolean} isFirst - true for the topmost section on the
 *   homepage. Its image is the page's LCP element and is therefore
 *   loaded eagerly at high priority; every other image on the page
 *   stays lazy. Preloading everything would just contend for
 *   bandwidth with the one image that actually matters.
 */
export default function HomeSection({ section, isFirst = false }) {
  const content = section.content || {};

  if (section.type === "hero") {
    return (
      <section className="relative bg-surface overflow-hidden min-h-[380px] h-[68svh] max-h-[560px] sm:h-[70svh] sm:max-h-[620px] md:h-[72svh] md:max-h-[680px]">
        {/* Was a flat h-[520px] at every width below 640px. On a
            320x568 iPhone SE that is 92% of the viewport, so the
            shopper saw nothing but the hero and had no signal that
            the page continued. Height is now viewport-relative and
            bounded: a floor so the copy always fits, a ceiling so it
            never dominates a large screen. svh (not vh) is used so
            mobile browsers' collapsing address bar doesn't make the
            hero jump as the shopper scrolls. */}
        {content.imageUrl && (
          <img
            {...imageProps(content.imageUrl, {
              width: 1600,
              sizes: "100vw",
              priority: isFirst,
            })}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-ink/35" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center py-10">
          <div className="max-w-lg">
            <h1 className="text-[clamp(1.75rem,7vw,3rem)] text-bg mb-4 sm:mb-6 leading-[1.15]">
              {content.heading || "Discover Your Signature Scent"}
            </h1>
            {content.subheading && (
              <p className="text-sm sm:text-base text-bg/80 mb-6 sm:mb-10 max-w-md">{content.subheading}</p>
            )}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Primary CTA always renders - falls back to sensible
                  defaults so the hero is never missing its main button
                  just because the CMS field was left blank. */}
              <Link
                to={content.primaryLink || "/perfumes"}
                className="btn-primary px-6 sm:px-8 py-3.5"
              >
                {content.primaryLabel || "Shop Now"}
              </Link>
              {content.secondaryLabel && (
                <Link
                  to={content.secondaryLink || "/"}
                  className="border border-bg/70 text-bg px-6 sm:px-8 py-3.5 text-xs tracking-luxury uppercase whitespace-nowrap min-h-[44px] inline-flex items-center justify-center hover:bg-bg hover:text-ink transition-colors duration-200"
                >
                  {content.secondaryLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "offer_banner") {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          to={content.link || "/offers"}
          className="block border border-border bg-surface p-6 sm:p-10 text-center hover:border-ink transition-colors"
        >
          <h2 className="text-xl sm:text-2xl mb-2">{content.heading}</h2>
          {content.subheading && (
            <p className="text-ink/50">{content.subheading}</p>
          )}
        </Link>
      </section>
    );
  }

  if (section.type === "featured_products") {
    const products = section.resolved?.products || [];
    if (products.length === 0) return null;
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 border-t border-border">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl">{content.heading || section.title}</h2>
        </div>
        <ProductCarousel>{products.map((p) => <ProductCard key={p.id} product={p} />)}</ProductCarousel>
      </section>
    );
  }

  if (section.type === "collections") {
    // The storefront's Collections tile only ever shows these two
    // shopping paths - Perfumes and Bottles - regardless of what
    // collections exist in the admin Collection catalog. This is
    // intentional: it's not meant to surface every marketing
    // collection, just the two primary product-type destinations.
    const tiles = [
      {
        name: "Perfumes",
        to: "/perfumes",
        imageUrl:
          content.perfumesImageUrl ||
          "https://picsum.photos/seed/scentisto-collection-perfumes/800/1000",
      },
      {
        name: "Bottles",
        to: "/bottles",
        imageUrl:
          content.bottlesImageUrl ||
          "https://picsum.photos/seed/scentisto-collection-bottles/800/1000",
      },
    ];
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 border-t border-border">
        <h2 className="text-xl sm:text-2xl mb-6 sm:mb-8">{content.heading || "Collections"}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl">
          {tiles.map((tile) => (
            <Link key={tile.to} to={tile.to} className="group">
              <div className="aspect-[4/5] bg-surface border border-border mb-3 overflow-hidden">
                <img
                  {...imageProps(tile.imageUrl, { width: 800, sizes: "(min-width: 640px) 320px, 50vw" })}
                  alt={tile.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-sm group-hover:underline">{tile.name}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "brand_story") {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 border-t border-border grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="aspect-video bg-surface border border-border overflow-hidden order-2 md:order-1">
          {content.imageUrl && (
            <img
              {...imageProps(content.imageUrl, { width: 1024, sizes: "(min-width: 768px) 50vw, 100vw" })}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="order-1 md:order-2">
          <h2 className="text-xl sm:text-2xl mb-4">{content.heading || "Our Story"}</h2>
          <p className="text-ink/60 leading-relaxed">{content.body}</p>
        </div>
      </section>
    );
  }

  if (section.type === "testimonials") {
    const reviews = section.resolved?.reviews || [];
    if (reviews.length === 0) return null;
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 border-t border-border">
        <h2 className="text-xl sm:text-2xl text-center mb-8 sm:mb-10">
          {content.heading || "What Our Customers Say"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((r) => (
            <div key={r.id} className="text-center">
              <div className="mb-2">{"★".repeat(r.rating)}</div>
              <p className="text-sm text-ink/60 mb-3">"{r.reviewText}"</p>
              <p className="text-xs text-ink/40">
                {r.customerName} · {r.productId?.name}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "instagram_feed") {
    const images = content.imageUrls || [];
    if (images.length === 0) return null;
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 border-t border-border">
        <h2 className="text-xl sm:text-2xl text-center mb-6 sm:mb-8">
          {content.heading || "Follow Us"}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {images.map((url, i) => (
            <div
              key={i}
              className="aspect-square bg-surface border border-border overflow-hidden"
            >
              <img
                {...imageProps(url, { width: 320, sizes: "(min-width: 768px) 160px, 33vw" })}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
