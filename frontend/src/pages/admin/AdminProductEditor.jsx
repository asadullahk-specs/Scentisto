import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import GeneralTab from "../../components/admin/product-editor/GeneralTab";
import MediaTab from "../../components/admin/product-editor/MediaTab";
import VariantsTab from "../../components/admin/product-editor/VariantsTab";
import DetailsTab from "../../components/admin/product-editor/DetailsTab";
import SeoTab from "../../components/admin/product-editor/SeoTab";
import GiftPackTab from "../../components/admin/product-editor/GiftPackTab";
import { adminProductsApi, adminCategoriesApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const BASE_TABS = ["General", "Media", "Variants", "Details", "SEO"];
const BLANK_FORM = {
  type: "perfume",
  hasVariants: true,
  status: "draft",
  isVisible: true,
  isGiftEligible: true,
};

export default function AdminProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { token } = useAdminAuth();

  const [activeTab, setActiveTab] = useState("General");
  const [productId, setProductId] = useState(id || null);
  const [form, setForm] = useState(BLANK_FORM);
  const [variants, setVariants] = useState([]);
  const [media, setMedia] = useState([]);
  const [details, setDetails] = useState(null);
  const [giftPackContents, setGiftPackContents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(!isNew);

  const TABS =
    form.type === "gift_pack" ? [...BASE_TABS, "Gift Pack"] : BASE_TABS;

  useEffect(() => {
    adminCategoriesApi
      .list(token)
      .then((data) => setCategories(data.flat || []))
      // A failed category fetch must not block editing everything
      // else on the form.
      .catch(() => setCategories([]));
  }, [token]);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await adminProductsApi.get(token, productId);
      setForm(toFormShape(data.product));
      setVariants(data.variants);
      setMedia(data.media);
      setDetails(data.details);
      setGiftPackContents(data.giftPackContents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function reloadMedia() {
    const data = await adminProductsApi.get(token, productId);
    setMedia(data.media);
  }
  async function reloadVariants() {
    const data = await adminProductsApi.get(token, productId);
    setVariants(data.variants);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = toPayload(form);
      if (productId) {
        const data = await adminProductsApi.update(token, productId, payload);
        // Re-seed the form from the server's response rather than
        // leaving the local draft in place. The backend normalises
        // several fields on write (it slugifies, resolves the media
        // type of a pasted URL, rewrites Drive links to the CDN form),
        // so without this the editor kept showing what was typed
        // instead of what was actually stored - and the admin got no
        // confirmation the save had happened at all.
        if (data?.product) setForm(toFormShape(data.product));
        setNotice("Saved.");
        setTimeout(() => setNotice(null), 3000);
      } else {
        const data = await adminProductsApi.create(token, payload);
        setProductId(data.product.id);
        navigate(`/admin/products/${data.product.id}/edit`, { replace: true });
        setNotice("Product created. Media, Variants and Details are now available.");
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl break-words">
            {isNew ? "Add Product" : form.name || "Edit Product"}
          </h1>
          <p className="text-sm text-ink/50 mt-1">
            {isNew
              ? "Save the General tab first - Media, Variants, and Details unlock afterward."
              : `SKU ${form.sku || " - "}`}
          </p>
        </div>
        <button
          className="admin-btn-outline"
          onClick={() => navigate("/admin/products")}
        >
          Back to Products
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3 mb-6">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-ink border border-border bg-surface px-4 py-3 mb-6">
          {notice}
        </p>
      )}

      <div className="scroll-x flex gap-1 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab-btn-active" : "tab-btn"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading...</p>
      ) : (
        <div className="admin-card">
          {activeTab === "General" && (
            <GeneralTab
              form={form}
              setForm={setForm}
              categories={categories}
              onSave={handleSave}
              saving={saving}
            />
          )}
          {activeTab === "Media" && (
            <MediaTab
              productId={productId}
              form={form}
              setForm={setForm}
              media={media}
              reloadMedia={reloadMedia}
              onSavePrimary={handleSave}
              saving={saving}
            />
          )}
          {activeTab === "Variants" && (
            <VariantsTab
              productId={productId}
              variants={variants}
              reload={reloadVariants}
            />
          )}
          {activeTab === "Details" && (
            <DetailsTab productId={productId} details={details} />
          )}
          {activeTab === "SEO" && (
            <SeoTab
              form={form}
              setForm={setForm}
              onSave={handleSave}
              saving={saving}
            />
          )}
          {activeTab === "Gift Pack" && (
            <GiftPackTab
              productId={productId}
              giftPackContents={giftPackContents}
              onSaved={loadProduct}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}

// ---- form <-> API payload shaping ----

function toFormShape(product) {
  return {
    type: product.type,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    categoryId: product.categoryId || "",
    shortDescription: product.shortDescription,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    price: product.price,
    salePrice: product.salePrice,
    hasVariants: Boolean(product.hasVariants),
    gender: product.gender || "",
    fragranceFamily: product.fragranceFamily || "",
    primaryMediaType: product.primaryMediaType,
    primaryMediaUrl: product.primaryMediaUrl,
    hoverImageUrl: product.hoverImageUrl,
    status: product.status,
    isVisible: Boolean(product.isVisible),
    isFeatured: Boolean(product.isFeatured),
    isTopSelling: Boolean(product.isTopSelling),
    isBestSeller: Boolean(product.isBestSeller),
    isTrending: Boolean(product.isTrending),
    isLimitedEdition: Boolean(product.isLimitedEdition),
    isNewArrival: Boolean(product.isNewArrival),
    isFlashSale: Boolean(product.isFlashSale),
    showOnHomepage: Boolean(product.showOnHomepage),
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    canonicalUrl: product.canonicalUrl,
  };
}

function toPayload(form) {
  const payload = { ...form };
  if (payload.categoryId === "") payload.categoryId = null;
  if (payload.price !== undefined) payload.price = Number(payload.price) || 0;
  if (payload.salePrice !== undefined && payload.salePrice !== "") {
    payload.salePrice = Number(payload.salePrice);
  } else {
    payload.salePrice = null;
  }
  return payload;
}
