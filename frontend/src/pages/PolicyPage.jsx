import { useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/public/Footer";

const POLICIES = {
  shipping: {
    title: "Shipping Policy",
    intro: "Everything you need to know about how and when your order arrives.",
    sections: [
      {
        heading: "Processing Time",
        body: "Orders are processed within 1–2 business days. You'll receive a confirmation email with tracking as soon as it ships.",
      },
      {
        heading: "Delivery Estimates",
        body: "Standard delivery takes 3–7 business days domestically, and 7–21 business days for international orders, depending on destination.",
      },
      {
        heading: "Shipping Costs",
        body: "Free shipping is available on all orders over Rs. 100. Below that threshold, a flat rate is calculated at checkout based on your location.",
      },
      {
        heading: "Tracking Your Order",
        body: "Once your order ships, you can track its progress any time from your Orders page after signing in.",
      },
    ],
  },
  returns: {
    title: "Return Policy",
    intro:
      "We want you to love what you ordered - here's how returns work if you don't.",
    sections: [
      {
        heading: "Return Window",
        body: "Unopened, unused items can be returned within 30 days of delivery for a full refund.",
      },
      {
        heading: "How to Start a Return",
        body: "Sign in, go to Orders, and select the item you'd like to return. We'll email you a prepaid shipping label.",
      },
      {
        heading: "Refunds",
        body: "Once your return is received and inspected, refunds are issued to your original payment method within 5–7 business days.",
      },
      {
        heading: "Exchanges",
        body: "Prefer a different fragrance or size? Let us know when starting your return and we'll arrange an exchange instead of a refund.",
      },
    ],
  },
};

export default function PolicyPage() {
  const { type } = useParams();
  const policy = POLICIES[type] || POLICIES.shipping;

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <section className="bg-surface border-b border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs tracking-luxury uppercase text-ink/40 mb-3">
            Customer Care
          </p>
          <h1 className="text-4xl mb-3">{policy.title}</h1>
          <p className="text-ink/50 max-w-md">{policy.intro}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        {policy.sections.map((s) => (
          <div key={s.heading}>
            <h2 className="text-lg mb-2">{s.heading}</h2>
            <p className="text-sm text-ink/60 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
