import { useState } from "react";

/**
 * Shared wrapper for Admin mutations.
 *
 * Almost every admin action in this codebase was written as
 * `await api(...); load();` with no try/catch. When the call failed -
 * a 403 from the per-route role check, a 409 on a duplicate slug, a
 * timeout on a cold start - the promise rejected, `load()` never ran,
 * and the admin saw the UI do nothing at all. That is the "button
 * does nothing / fails silently" symptom, and it is a reporting bug
 * rather than a wiring bug: the request was usually correct.
 *
 * run() gives every action the same contract: report the failure,
 * confirm the success, and only refetch once the server has actually
 * acknowledged the change.
 */
export default function useAdminAction(reload) {
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function run(action, { successMessage, id = null } = {}) {
    setBusyId(id ?? "global");
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (reload) await reload();
      if (successMessage) {
        setNotice(successMessage);
        setTimeout(() => setNotice(null), 3000);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return undefined;
    } finally {
      setBusyId(null);
    }
  }

  return { run, error, notice, busyId, setError, setNotice };
}
