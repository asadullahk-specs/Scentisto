import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import NotificationBell from "./NotificationBell";
import logoWordmarkWhite from "../../assets/logo-wordmark-white.png";

/**
 * Sidebar matches the module list from the Admin CMS master prompt
 * (Section 7). Only Dashboard, Products, and Media Library are wired
 * to real screens as of Phase 2 - everything else is a placeholder
 * link so the full information architecture is visible early, and
 * later phases simply replace the "coming soon" stub behind each
 * link without touching this file's structure.
 */
const NAV_SECTIONS = [
  {
    label: "Commerce",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", ready: true },
      { to: "/admin/products", label: "Products", ready: true },
      { to: "/admin/categories", label: "Categories", ready: true },
      { to: "/admin/orders", label: "Orders", ready: true },
      { to: "/admin/customers", label: "Customers", ready: false },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/admin/homepage-cms", label: "Homepage CMS", ready: true },
      { to: "/admin/reviews", label: "Reviews", ready: true },
      { to: "/admin/blogs", label: "Blogs", ready: true },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/media-library", label: "Media Library", ready: true },
      { to: "/admin/menus", label: "Menus", ready: false },
    ],
  },
  {
    label: "System",
    items: [
      // Analytics lives on the Dashboard itself (KPIs + charts), so
      // there's no separate "Analytics" screen to link to here.
      { to: "/admin/activity-log", label: "Activity Log", ready: true },
      { to: "/admin/settings", label: "Settings", ready: false },
      { to: "/admin/user-roles", label: "User Roles", ready: false },
    ],
  },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="w-64 shrink-0 bg-ink text-bg flex flex-col">
        <div className="px-5 py-6 border-b border-bg/10">
          <Link to="/admin/dashboard" className="block">
            <img src={logoWordmarkWhite} alt="SCENTISTO" className="h-5 w-auto" />
          </Link>
          <div className="text-[11px] text-bg/50 uppercase tracking-luxury mt-0.5">
            Admin CMS
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <div className="px-4 mb-1 text-[10px] uppercase tracking-luxury text-bg/35">
                {section.label}
              </div>
              {section.items.map((item) =>
                item.ready ? (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? "sidebar-link-active" : "sidebar-link"
                    }
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <span
                    key={item.to}
                    className="sidebar-link cursor-not-allowed opacity-40"
                    title="Coming in a later phase"
                  >
                    {item.label}
                  </span>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-bg/10 text-xs text-bg/50">
          Signed in as
          <div className="text-bg text-sm mt-0.5">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="uppercase tracking-luxury text-[10px] mt-0.5">
            {user?.role}
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/admin/login");
            }}
            className="mt-3 text-bg/60 hover:text-bg transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="flex justify-end px-8 pt-4">
          <NotificationBell />
        </div>
        <div className="max-w-6xl mx-auto px-8 pb-10 pt-2">{children}</div>
      </main>
    </div>
  );
}
