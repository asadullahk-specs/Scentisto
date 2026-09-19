import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCustomerAuth } from "./CustomerAuthContext";
import { cartApi } from "../api/cartApi";

const CartContext = createContext(null);
const GUEST_CART_KEY = "scentisto_guest_cart";

/**
 * Guests can browse and add to cart with no account - the cart itself
 * is not sensitive data, so it's fine to persist client-side in
 * localStorage (unlike the auth token, which is deliberately never
 * persisted; see createAuthContext.jsx). Once the shopper logs in,
 * whatever was in the guest cart is merged into their real,
 * server-side cart (source of truth from then on), and the
 * localStorage copy is cleared. This is what makes "no checkout
 * without login" workable without losing whatever the shopper had
 * already picked out before deciding to sign in.
 */
function readGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const { isAuthenticated, token } = useCustomerAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const wasAuthenticated = useRef(false);

  const fetchServerCart = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cartApi.get(token);
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mount: guests start from whatever's in localStorage.
  useEffect(() => {
    if (!isAuthenticated) setItems(readGuestCart());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transition guest -> logged in: merge local items into the server
  // cart once, then treat the server as the source of truth.
  useEffect(() => {
    async function onAuthChange() {
      if (isAuthenticated && !wasAuthenticated.current) {
        const guestItems = readGuestCart();
        if (guestItems.length > 0) {
          setLoading(true);
          try {
            const merged = await cartApi.merge(
              token,
              guestItems.map(({ productId, variantId, quantity }) => ({
                productId,
                variantId,
                quantity,
              })),
            );
            setItems(merged.items);
          } finally {
            setLoading(false);
          }
          localStorage.removeItem(GUEST_CART_KEY);
        } else {
          await fetchServerCart();
        }
      } else if (!isAuthenticated && wasAuthenticated.current) {
        // Logged out (or a refresh wiped the session, per the memory-only
        // token design) - fall back to whatever's in the guest cart, if anything.
        setItems(readGuestCart());
      }
      wasAuthenticated.current = isAuthenticated;
    }
    onAuthChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const addItem = useCallback(
    async (product, variant, quantity = 1) => {
      if (isAuthenticated) {
        setLoading(true);
        try {
          const data = await cartApi.addItem(token, {
            productId: product.id,
            variantId: variant?.id || null,
            quantity,
          });
          setItems(data.items);
        } finally {
          setLoading(false);
        }
      } else {
        const unitPrice = variant
          ? (variant.salePrice ?? variant.price)
          : (product.salePrice ?? product.price);
        const current = readGuestCart();
        const existingIndex = current.findIndex(
          (i) =>
            i.productId === product.id &&
            String(i.variantId || "") === String(variant?.id || ""),
        );
        let next;
        if (existingIndex >= 0) {
          next = [...current];
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + quantity,
          };
        } else {
          next = [
            ...current,
            {
              itemId: `guest-${product.id}-${variant?.id || "base"}`,
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              imageUrl: product.primaryMediaUrl,
              variantId: variant?.id || null,
              variantLabel: variant?.label || null,
              sku: variant?.sku || product.sku,
              unitPrice,
              quantity,
              lineTotal: Math.round(unitPrice * quantity * 100) / 100,
              inStock: true,
            },
          ];
        }
        writeGuestCart(next);
        setItems(next);
      }
    },
    [isAuthenticated, token],
  );

  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      if (isAuthenticated) {
        setLoading(true);
        try {
          const data = await cartApi.updateItem(token, itemId, quantity);
          setItems(data.items);
        } finally {
          setLoading(false);
        }
      } else {
        const current = readGuestCart();
        const next =
          quantity <= 0
            ? current.filter((i) => i.itemId !== itemId)
            : current.map((i) =>
                i.itemId === itemId
                  ? {
                      ...i,
                      quantity,
                      lineTotal: Math.round(i.unitPrice * quantity * 100) / 100,
                    }
                  : i,
              );
        writeGuestCart(next);
        setItems(next);
      }
    },
    [isAuthenticated, token],
  );

  const removeItem = useCallback(
    async (itemId) => {
      if (isAuthenticated) {
        setLoading(true);
        try {
          const data = await cartApi.removeItem(token, itemId);
          setItems(data.items);
        } finally {
          setLoading(false);
        }
      } else {
        const next = readGuestCart().filter((i) => i.itemId !== itemId);
        writeGuestCart(next);
        setItems(next);
      }
    },
    [isAuthenticated, token],
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal =
    Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;

  const value = {
    items,
    itemCount,
    subtotal,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    refresh: fetchServerCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider.");
  return ctx;
}
