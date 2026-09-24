import { useEffect, useState } from "react";
import { getInstitutions, getSheetDataRevision } from "../services/api";

// Read every response page before grouping so institutions cannot be split
// across pages and their response counts are complete for the active filters.
export function useInstitutionGroups(query, institutionType, region) {
  const key = JSON.stringify([getSheetDataRevision(), query.trim().toLowerCase(), institutionType, region]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, key: "", loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, loading: true, error: "" }));
    const timer = setTimeout(async () => {
      try {
        const params = { query: query.trim().toLowerCase(), institutionType, region, pageSize: 100 };
        const first = await getInstitutions({ ...params, page: 1 });
        const rows = [...first.data];
        const pages = Math.ceil((Number(first.total) || rows.length) / 100);
        for (let page = 2; page <= pages; page++) {
          if (!active) return;
          const next = await getInstitutions({ ...params, page });
          rows.push(...next.data);
        }
        if (active) setState({ key, data: { ...first, data: rows, total: rows.length }, loading: false, error: "" });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, key, loading: false, error: error.message }));
      }
    }, query.trim() ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [key, attempt]);
  return {
    data: state.data,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : "",
    hasCurrentData: state.key === key && !state.loading && !state.error,
    reload: () => setAttempt(value => value + 1)
  };
}
