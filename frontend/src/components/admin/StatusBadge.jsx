const STATUS_STYLES = {
  published: "text-ink border-ink",
  draft: "text-ink/50 border-border",
  unpublished: "text-ink/50 border-border",
  archived: "text-ink/40 border-border line-through",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`badge ${STATUS_STYLES[status] || "text-ink/50 border-border"}`}
    >
      {status}
    </span>
  );
}
