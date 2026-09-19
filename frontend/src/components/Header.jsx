import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useCart } from "../context/CartContext";
import logoMark from "../assets/logo-mark.png";
import logoWordmark from "../assets/logo-wordmark.png";

const NAV_LINKS = [
  { to: "/perfumes", label: "Perfumes" },
  { to: "/bottles", label: "Bottles" },
  { to: "/blog", label: "Journal" },
];

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M3 6l9 7 9-7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </svg>
  );
}

function BurgerIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export default function Header() {
  const { isAuthenticated, user, logout } = useCustomerAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // The mobile menu can be taller than a short phone viewport, so the
  // page behind it must not scroll while it is open - otherwise the
  // shopper scrolls the page instead of the menu and the menu's last
  // items become unreachable.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Escape closes whichever panel is open.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return undefined;
    function onKey(e) {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setSearchOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    function onClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [accountOpen]);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setMenuOpen(false);
      setQuery("");
    }
  }

  // NOTE: this element previously carried `relative` alongside
  // `sticky` - two conflicting position values whose winner depended
  // on Tailwind's internal rule order. Only `sticky` is wanted; the
  // search panel positions against it either way.
  return (
    <header className="sticky top-0 bg-bg z-30">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0" onClick={() => setMenuOpen(false)}>
            <img src={logoMark} alt="" className="h-7 w-7 sm:h-8 sm:w-8" width="32" height="32" />
            <img src={logoWordmark} alt="SCENTISTO" className="h-4 sm:h-5 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-8 text-sm flex-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-ink/60 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 xs:gap-2 sm:gap-4 shrink-0">
            {/* Search and Cart are shown at EVERY width. Previously
                this whole cluster was `hidden sm:flex`, so on any
                phone under 640px there was no cart icon and no item
                count anywhere in the header - the only route to the
                cart was to open the burger menu and scroll to the
                bottom of it. */}
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Search"
              className="sm:hidden p-2 -m-0.5 hover:text-ink/60 transition-colors"
            >
              <SearchIcon />
            </button>

            <Link
              to="/cart"
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
              className="sm:hidden relative p-2 -m-0.5 hover:text-ink/60 transition-colors"
            >
              <BagIcon />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] leading-none bg-ink text-bg">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:flex items-center gap-5">
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                aria-label="Search"
                className="hover:text-ink/60 transition-colors"
              >
                <SearchIcon />
              </button>

              <Link to="/contact" aria-label="Contact" className="hover:text-ink/60 transition-colors">
                <MailIcon />
              </Link>

              <div className="relative" ref={accountRef}>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setAccountOpen((o) => !o)}
                    aria-label="Account"
                    className="hover:text-ink/60 transition-colors"
                  >
                    <UserIcon />
                  </button>
                ) : (
                  <Link to="/login" aria-label="Sign In" className="hover:text-ink/60 transition-colors">
                    <UserIcon />
                  </Link>
                )}

                {isAuthenticated && accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 max-w-[calc(100vw-2rem)] bg-bg border border-border shadow-soft z-40 text-sm">
                    <div className="px-4 py-3 border-b border-border text-ink/50 text-xs truncate">
                      Hi, {user.firstName}
                    </div>
                    <Link to="/orders" className="block px-4 py-2.5 hover:bg-surface" onClick={() => setAccountOpen(false)}>
                      Orders
                    </Link>
                    <button
                      onClick={async () => {
                        setAccountOpen(false);
                        await logout();
                        navigate("/");
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>

              <Link to="/cart" aria-label="Cart" className="relative hover:text-ink/60 transition-colors">
                <BagIcon />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-ink text-bg">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="lg:hidden p-2 -m-0.5 hover:text-ink/60 transition-colors"
            >
              <BurgerIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </div>

      {/* Search panel - drops down from the top of the header, full width */}
      <div
        className={`absolute left-0 right-0 bg-bg border-b border-border shadow-soft transition-all duration-300 overflow-hidden ${
          searchOpen ? "max-h-28 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        {/* min-w-0 on the input is what keeps this usable at 320px.
            An <input> has an intrinsic min-content width derived from
            its `size` attribute (~20 characters), and flex children
            default to min-width:auto - so `flex-1` alone could not
            shrink it below roughly 175px and the row overflowed the
            viewport on a small phone. */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-2 sm:gap-3">
          <span className="shrink-0 text-ink/50"><SearchIcon /></span>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search perfumes, bottles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
            className="flex-1 min-w-0 bg-transparent border-0 border-b border-border focus:border-ink outline-none py-1.5 text-sm transition-colors"
          />
          <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="shrink-0 p-2 text-ink/40 hover:text-ink">
            ✕
          </button>
        </form>
      </div>

      {/* Mobile / tablet menu - nav links always, action icons only below 640px */}
      <div
        className={`lg:hidden bg-bg border-b border-border overflow-hidden transition-[max-height] duration-300 ${
          menuOpen
            ? "max-h-[calc(100vh-4rem)] overflow-y-auto"
            : "max-h-0"
        }`}
      >
        {/* Was a fixed max-h-[420px]. A logged-in shopper's menu has
            eight rows, which overflows that on any phone, and with
            overflow-hidden the last items (including Cart) simply
            could not be reached. Now it is bounded by the viewport
            and scrolls internally instead. */}
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="py-2.5 border-b border-border/60 last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div className="sm:hidden flex flex-col gap-1 pt-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex items-center gap-3 py-2.5 border-b border-border/60"
            >
              <SearchIcon /> Search
            </button>
            <Link to="/contact" className="flex items-center gap-3 py-2.5 border-b border-border/60" onClick={() => setMenuOpen(false)}>
              <MailIcon /> Contact
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/orders" className="flex items-center gap-3 py-2.5 border-b border-border/60" onClick={() => setMenuOpen(false)}>
                  <UserIcon /> Orders
                </Link>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    navigate("/");
                  }}
                  className="flex items-center gap-3 py-2.5 border-b border-border/60 text-left"
                >
                  <UserIcon /> Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="flex items-center gap-3 py-2.5 border-b border-border/60" onClick={() => setMenuOpen(false)}>
                <UserIcon /> Sign In
              </Link>
            )}
            <Link to="/cart" className="flex items-center gap-3 py-2.5" onClick={() => setMenuOpen(false)}>
              <BagIcon /> Cart{itemCount > 0 ? ` (${itemCount})` : ""}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
