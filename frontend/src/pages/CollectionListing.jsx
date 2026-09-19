import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductListing from "./ProductListing";
import { publicCollectionsApi } from "../api/publicApi";

export default function CollectionListing() {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);

  useEffect(() => {
    publicCollectionsApi.list().then((data) => {
      setCollection(
        (data.collections || []).find((c) => c.slug === slug) || null,
      );
    });
  }, [slug]);

  return (
    <ProductListing
      title={collection?.name || "Collection"}
      subtitle={collection?.description}
      baseFilters={{ collection: slug }}
    />
  );
}
