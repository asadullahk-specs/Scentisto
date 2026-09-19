import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/public/Footer";

const FAQS = [
  {
    question: "How long does shipping take?",
    answer:
      "Standard orders arrive within 3–7 business days. Expedited options are available at checkout.",
  },
  {
    question: "Do you offer international shipping?",
    answer:
      "Yes, we ship to most countries. International delivery times vary by destination.",
  },
  {
    question: "What is your return policy?",
    answer:
      "Unopened items can be returned within 30 days of delivery for a full refund. See our Return Policy for details.",
  },
  {
    question: "Are your fragrances authentic?",
    answer:
      "Every fragrance is sourced directly and crafted in-house - nothing sold on SCENTISTO is a replica.",
  },
  {
    question: "Can I change or cancel my order after placing it?",
    answer:
      "Orders can be modified within 1 hour of placement. Contact us as soon as possible and we'll do our best to help.",
  },
];

function ChevronIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function FAQs() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <section className="bg-surface border-b border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs tracking-luxury uppercase text-ink/40 mb-3">
            Customer Care
          </p>
          <h1 className="text-4xl mb-3">Frequently Asked Questions</h1>
          <p className="text-ink/50 max-w-md">
            Answers to the questions we hear most often.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-border bg-bg">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left"
              >
                <span className="text-sm sm:text-base">{faq.question}</span>
                <ChevronIcon open={openIndex === i} />
              </button>
              {openIndex === i && (
                <p className="px-5 pb-5 text-sm text-ink/60 leading-relaxed">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
