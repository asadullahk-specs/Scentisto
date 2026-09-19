export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages } = meta;

  return (
    <div className="flex items-center justify-between mt-6 text-sm text-ink/60">
      <span>
        Page {page} of {totalPages} · {meta.total} results
      </span>
      <div className="flex gap-2">
        <button
          className="admin-btn-outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="admin-btn-outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
