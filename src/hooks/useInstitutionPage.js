import { useEffect, useState } from "react";
import { getInstitutions, getSheetDataRevision, peekInstitutionPage } from "../services/api";

export function useInstitutionPage(page, pageSize, query = "", filters = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  const institutionType = String(filters.institutionType || "").trim().toUpperCase();
  const region = String(filters.region || "").trim().toLowerCase();
  const params = { page, pageSize, query: normalizedQuery, institutionType, region };
  const key = JSON.stringify([getSheetDataRevision(), page, pageSize, normalizedQuery, institutionType, region]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(() => ({
    key, dataKey: key, data: peekInstitutionPage(params), loading: !peekInstitutionPage(params), error: ""
  }));
  const cached = peekInstitutionPage(params);
  useEffect(() => {
    let active = true;
    const available = peekInstitutionPage(params);
    if (available) {
      setState({ key, dataKey: key, data: available, loading: false, error: "" });
      return;
    }
    setState(previous => ({ ...previous, key, loading: true, error: "" }));
    const timer = setTimeout(() => {
      getInstitutions(params).then(data => {
        if (!Array.isArray(data.data)) throw new Error("The data service returned invalid records. Please retry.");
        if (active) setState({ key, dataKey: key, data, loading: false, error: "" });
      }).catch(error => {
        if (active) setState(previous => ({ ...previous, key, loading: false, error: error.message }));
      });
    }, normalizedQuery ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [key, attempt]);
  return {
    data: cached || state.data,
    hasCurrentData: Boolean(cached) || (Boolean(state.data) && state.dataKey === key),
    loading: !cached && (state.key !== key || state.loading),
    error: cached || state.key !== key ? "" : state.error,
    reload: () => setAttempt(value => value + 1)
  };
}
