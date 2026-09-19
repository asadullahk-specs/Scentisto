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
  const [loading, setLoading] = useState(!isNew);

  const TABS =
    form.type === "gift_pack" ? [...BASE_TABS, "Gift Pack"] : BASE_TABS;

  useEffect(() => {
    adminCategoriesApi
      .list(token)
      .then((data) => setCategories(data.flat || []));
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
    try {
      const payload = toPayload(form);
      if (productId) {
        await adminProductsApi.update(token, productId, payload);
      } else {
        const data = await adminProductsApi.create(token, payload);
        setProductId(data.product.id);
        navigate(`/admin/products/${data.product.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl">
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
        <div className="admin-card mb-6 border-ink/30">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-border">
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
