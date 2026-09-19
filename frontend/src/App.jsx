import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { CartProvider } from "./context/CartContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import Cart from "./pages/Cart";
import OrderHistory from "./pages/OrderHistory";
import OrderDetail from "./pages/OrderDetail";
import Contact from "./pages/Contact";
import FAQs from "./pages/FAQs";
import PolicyPage from "./pages/PolicyPage";
import ProductListing from "./pages/ProductListing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CollectionListing from "./pages/CollectionListing";
import ProductDetail from "./pages/ProductDetail";


/**
 * The Admin CMS is lazy-loaded. It is the only part of the app that
 * uses recharts (~383 kB raw / ~106 kB gzipped), and because every
 * admin page was statically imported here, that chart library sat in
 * the initial JavaScript graph of the *public storefront* too - every
 * shopper downloaded and parsed the admin dashboard's charting code
 * before the homepage could become interactive. Splitting it here
 * keeps it entirely out of the storefront's critical path.
 */
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductEditor = lazy(() => import("./pages/admin/AdminProductEditor"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/AdminMediaLibrary"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminHomepageCMS = lazy(() => import("./pages/admin/AdminHomepageCMS"));
const AdminBlogs = lazy(() => import("./pages/admin/AdminBlogs"));
const AdminBlogEditor = lazy(() => import("./pages/admin/AdminBlogEditor"));

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-ink/40">
      Loading admin…
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Top-level /admin redirect */}
      <Route
        path="/admin"
        element={<Navigate to="/admin/dashboard" replace />}
      />

      {/* ---- Admin CMS (isolated admin auth world) - declared first, and
 also the more specific pattern, so it always wins over "/*" ---- */}
      <Route
        path="/admin/*"
        element={
          <AdminAuthProvider>
            <Suspense fallback={<AdminFallback />}>
            <Routes>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="login" element={<AdminLogin />} />
              <Route
                path="dashboard"
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="activity-log"
                element={
                  <AdminProtectedRoute>
                    <AdminActivityLog />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="products"
                element={
                  <AdminProtectedRoute>
                    <AdminProducts />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="products/new"
                element={
                  <AdminProtectedRoute>
                    <AdminProductEditor />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="products/:id/edit"
                element={
                  <AdminProtectedRoute>
                    <AdminProductEditor />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="categories"
                element={
                  <AdminProtectedRoute>
                    <AdminCategories />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="media-library"
                element={
                  <AdminProtectedRoute>
                    <AdminMediaLibrary />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <AdminProtectedRoute>
                    <AdminOrders />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <AdminProtectedRoute>
                    <AdminOrderDetail />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="reviews"
                element={
                  <AdminProtectedRoute>
                    <AdminReviews />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="homepage-cms"
                element={
                  <AdminProtectedRoute>
                    <AdminHomepageCMS />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="blogs"
                element={
                  <AdminProtectedRoute>
                    <AdminBlogs />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="blogs/new"
                element={
                  <AdminProtectedRoute>
                    <AdminBlogEditor />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="blogs/:id/edit"
                element={
                  <AdminProtectedRoute>
                    <AdminBlogEditor />
                  </AdminProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
            </Suspense>
          </AdminAuthProvider>
        }
      />

      {/* ---- Public storefront (customer auth world) ---- */}
      <Route
        path="/*"
        element={
          <CustomerAuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faqs" element={<FAQs />} />
                <Route path="/policies/:type" element={<PolicyPage />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route
                  path="/perfumes"
                  element={
                    <ProductListing
                      title="Perfumes"
                      subtitle="Crafted with signatures for distinguished impressions."
                      baseFilters={{ type: "perfume" }}
                    />
                  }
                />
                <Route
                  path="/bottles"
                  element={
                    <ProductListing
                      title="Bottles"
                      subtitle="Premium, empty perfume bottles."
                      baseFilters={{ type: "bottle" }}
                    />
                  }
                />
                <Route
                  path="/gift-sets"
                  element={
                    <ProductListing
                      title="Gift Sets"
                      subtitle="The perfect gift for your loved ones."
                      baseFilters={{ type: "gift_pack" }}
                    />
                  }
                />
                <Route
                  path="/new-arrivals"
                  element={
                    <ProductListing
                      title="New Arrivals"
                      subtitle="Explore our latest fragrances."
                      baseFilters={{ newArrival: true }}
                    />
                  }
                />
                <Route
                  path="/best-sellers"
                  element={
                    <ProductListing
                      title="Best Sellers"
                      subtitle="Our most loved fragrances."
                      baseFilters={{ bestSeller: true }}
                    />
                  }
                />
                <Route
                  path="/offers"
                  element={
                    <ProductListing
                      title="Exclusive Offers"
                      subtitle="Limited time. Unbeatable deals."
                      baseFilters={{ flashSale: true }}
                    />
                  }
                />
                <Route
                  path="/collections/:slug"
                  element={<CollectionListing />}
                />
                <Route
                  path="/search"
                  element={<ProductListing title="Search" useSearchQuery />}
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </CartProvider>
          </CustomerAuthProvider>
        }
      />
    </Routes>
  );
}
