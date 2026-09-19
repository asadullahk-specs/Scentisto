import { Link } from "react-router-dom";

export default function GiftPackContents({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-t border-border pt-6 mt-6">
      <h3 className="text-sm uppercase tracking-luxury text-ink/50 mb-3">
        What's Included
      </h3>
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.productId}
            to={`/product/${item.slug}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-12 h-12 bg-surface border border-border shrink-0 overflow-hidden">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="text-sm">
              <span className="group-hover:underline">{item.name}</span>
              {item.variantLabel && (
                <span className="text-ink/50"> - {item.variantLabel}</span>
              )}
              <span className="text-ink/40"> × {item.quantity}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
