import { Fragment, useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { adminAnalyticsApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const ACTION_PREFIXES = [
  ["", "All Actions"],
  ["auth.", "Auth"],
  ["product.", "Products"],
  ["order.", "Orders"],
  ["review.", "Reviews"],
  ["homepage.", "Homepage CMS"],
];

function formatTimestamp(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminActivityLog() {
  const { token } = useAdminAuth();
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [actionPrefix, setActionPrefix] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAnalyticsApi.getActivityLog(token, {
        action: actionPrefix || undefined,
        page,
        perPage: 40,
      });
      setEntries(data.activity);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [token, actionPrefix, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterChange(value) {
    setActionPrefix(value);
    setPage(1);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl mb-1">Activity Log</h1>
      <p className="text-sm text-ink/50 mb-6">
        Every logged write across the Admin CMS - who did what, when, and from
        where.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {ACTION_PREFIXES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={actionPrefix === value ? "tab-btn-active" : "tab-btn"}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-ink/40">
          No activity logged for this filter yet.
        </p>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Staff Member</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    className={
                      entry.previousValue || entry.newValue
                        ? "cursor-pointer hover:bg-surface"
                        : ""
                    }
                    onClick={() =>
                      setExpanded(expanded === entry.id ? null : entry.id)
                    }
                  >
                    <td className="whitespace-nowrap text-ink/60">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td>
                      {entry.user ? (
                        <>
                          {entry.user.firstName} {entry.user.lastName}
                          <span className="text-ink/40">
                            {" "}
                            · {entry.user.role}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink/40">System</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">{entry.action}</td>
                    <td className="text-ink/60">
                      {entry.entityType
                        ? `${entry.entityType} · ${entry.entityId?.slice(-6) || ""}`
                        : " - "}
                    </td>
                    <td className="text-ink/40 text-xs">
                      {entry.ipAddress || " - "}
                    </td>
                  </tr>
                  {expanded === entry.id &&
                    (entry.previousValue || entry.newValue) && (
                      <tr>
                        <td colSpan={5} className="bg-surface">
                          <pre className="text-xs whitespace-pre-wrap p-3 text-ink/70">
                            {JSON.stringify(
                              {
                                previous: entry.previousValue,
                                new: entry.newValue,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </td>
                      </tr>
                    )}
                </Fragment>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-6 text-xs text-ink/50">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="admin-btn-outline"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                className="admin-btn-outline"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
