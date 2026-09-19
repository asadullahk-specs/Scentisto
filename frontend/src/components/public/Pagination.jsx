export default function StorefrontPagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages } = meta;

  return (
    <div className="flex items-center justify-center gap-4 mt-12 text-sm">
      <button
        className="btn-outline px-4 py-2 text-xs"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-ink/50">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-outline px-4 py-2 text-xs"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
