import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/public/Footer";

const SUBJECTS = [
  "General Inquiry",
  "Product Information",
  "Order Support",
  "Wholesale",
  "Feedback",
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <section className="bg-surface border-b border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl mb-3">We're Here to Help</h1>
          <p className="text-ink/50 max-w-md">
            Have a question or need assistance? Our team is ready to help.
          </p>
        </div>
      </section>

      <div className="max-w-xl mx-auto px-6 py-16">
        {submitted ? (
          <p className="text-sm text-ink/60 text-center">
            Thanks for reaching out - a real submission endpoint ships with the
            Content Management phase.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-luxury">Full Name</label>
                <input className="input-luxury" required />
              </div>
              <div>
                <label className="label-luxury">Email Address</label>
                <input type="email" className="input-luxury" required />
              </div>
            </div>
            <div>
              <label className="label-luxury">Subject</label>
              <select className="input-luxury" required defaultValue="">
                <option value="" disabled>
                  Select a subject
                </option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-luxury">Message</label>
              <textarea
                className="input-luxury h-32 resize-none"
                maxLength={1000}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Send Message
            </button>
          </form>
        )}
      </div>

      <Footer />
    </div>
  );
}
