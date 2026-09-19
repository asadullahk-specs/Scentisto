import { Link } from "react-router-dom";
import logoMark from "../../assets/logo-mark.png";
import logoWordmarkWhite from "../../assets/logo-wordmark-white.png";

export default function Footer() {
  return (
    <footer className="bg-ink text-bg mt-24">
      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoMark} alt="" className="h-6 w-6 invert" />
            <img src={logoWordmarkWhite} alt="SCENTISTO" className="h-4 w-auto" />
          </div>
          <p className="text-sm text-bg/60">
            Crafted for memories - luxury perfumes and bottles for discerning
            taste.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-luxury text-bg/40 mb-3">
            Shop
          </div>
          <ul className="space-y-2 text-sm text-bg/70">
            <li>
              <Link to="/perfumes" className="hover:text-bg">
                Perfumes
              </Link>
            </li>
            <li>
              <Link to="/bottles" className="hover:text-bg">
                Bottles
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-bg">
                Journal
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-luxury text-bg/40 mb-3">
            Customer Care
          </div>
          <ul className="space-y-2 text-sm text-bg/70">
            <li>
              <Link to="/contact" className="hover:text-bg">
                Contact Us
              </Link>
            </li>
            <li>
              <Link to="/faqs" className="hover:text-bg">
                FAQs
              </Link>
            </li>
            <li>
              <Link to="/policies/shipping" className="hover:text-bg">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link to="/policies/returns" className="hover:text-bg">
                Return Policy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-luxury text-bg/40 mb-3">
            Account
          </div>
          <ul className="space-y-2 text-sm text-bg/70">
            <li>
              <Link to="/login" className="hover:text-bg">
                Sign In
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-bg">
                Create Account
              </Link>
            </li>
            <li>
              <Link to="/checkout" className="hover:text-bg">
                Checkout
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-bg/10 py-6 text-center text-xs text-bg/40">
        © {new Date().getFullYear()} SCENTISTO. All rights reserved.
      </div>
    </footer>
  );
}
