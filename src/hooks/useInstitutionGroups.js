import { useEffect, useRef, useState } from "react";
import { getInstitutions, getSheetDataRevision } from "../services/api";

const STORAGE_PREFIX = "childcare-institution-groups:v3:";
const SOURCE = import.meta.env.VITE_SHEET_API_URL || "demo";
const CACHE_MS = 5 * 60 * 1000;
const entries = new Map();
const pending = new Map();

function readEntry(key) {
  if (entries.has(key)) return entries.get(key);
  try {
    const entry = JSON.parse(window.localStorage.getItem(STORAGE_PREFIX + key));
    if (entry && Array.isArray(entry.data?.data) && Date.now() - entry.savedAt < CACHE_MS) {
      // A revision only has meaning within the current browser execution.
      entry.revision = -1;
      entries.set(key, entry);
      return entry;
    }
  } catch { /* Storage may be unavailable. */ }
  return null;
}

function saveEntry(key, data, revision, complete) {
  const entry = { data, revision, complete, savedAt: Date.now() };
  entries.set(key, entry);
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch { /* Keep using the memory cache if storage is full or disabled. */ }
  return entry;
}

function loadGroups(key, params, revision, publish, force) {
  if (pending.has(key)) {
    const job = pending.get(key);
    job.listeners.add(publish);
    return job;
  }
  const job = { listeners: new Set([publish]) };
  pending.set(key, job);
  job.promise = (async () => {
    // Publish the first batch immediately, then keep filling the cache.
    const requestParams = { pageSize: 5000, ...params, _force: force };
    const first = await getInstitutions({ ...requestParams, page: 1 });
    if (!Array.isArray(first.data)) throw new Error("The data service returned invalid records. Please retry.");
    const total = Number(first.total) || first.data.length;
    let data = { ...first, total };
    // Older deployments may cap page size. Continue at their actual size so
    // subsequent requests cannot skip responses.
    const pageSize = Number(first.pageSize) > 0 ? Number(first.pageSize) : first.data.length;
    if (total > 0 && pageSize === 0) throw new Error("The data service returned incomplete records. Please retry.");
    requestParams.pageSize = pageSize || requestParams.pageSize;
    const pages = total ? Math.ceil(total / requestParams.pageSize) : 0;
    const publishData = complete => {
      const entry = saveEntry(key, data, revision, complete);
      job.listeners.forEach(listener => listener(entry));
    };
    publishData(pages <= 1);
    for (let page = 2; page <= pages; page++) {
      const next = await getInstitutions({ ...requestParams, page });
      if (!Array.isArray(next.data)) throw new Error("The data service returned invalid records. Please retry.");
      data = { ...data, data: data.data.concat(next.data) };
      publishData(page === pages);
    }
  })().finally(() => pending.delete(key));
  return job;
}

export function useInstitutionGroups(query, institutionType, region, pageSize = 5000) {
  const params = { query: query.trim().toLowerCase(), institutionType, region, pageSize };
  const key = JSON.stringify([SOURCE, params.query, institutionType, region, pageSize]);
  const revision = getSheetDataRevision();
  const [attempt, setAttempt] = useState(0);
  const forceRefresh = useRef(false);
  const [state, setState] = useState(() => ({ key, data: readEntry(key)?.data, loading: !readEntry(key), error: "" }));
  const cached = readEntry(key);

  useEffect(() => {
    let active = true;
    let job;
    const available = readEntry(key);
    const force = forceRefresh.current;
    forceRefresh.current = false;
    setState({ key, data: available?.data, loading: true, error: "" });
    if (!force && available?.complete && available.revision === revision && Date.now() - available.savedAt < CACHE_MS) {
      setState({ key, data: available.data, loading: false, error: "" });
      return;
    }
    const publish = entry => {
      if (active) setState({ key, data: entry.data, loading: !entry.complete, error: "" });
    };
    const timer = setTimeout(() => {
      job = loadGroups(key, params, revision, publish, force);
      job.promise.catch(error => {
        if (active) setState(previous => ({ ...previous, loading: false, error: error.message }));
      });
    }, params.query && !available ? 300 : 0);
    // Shared loading continues and saves results even after navigating away.
    return () => { active = false; clearTimeout(timer); job?.listeners.delete(publish); };
  }, [key, revision, attempt]);

  const data = cached?.data || (state.key === key ? state.data : null);
  return {
    data,
    loading: !data && (state.key !== key || state.loading),
    backgroundLoading: Boolean(data) && (state.key !== key || state.loading),
    error: state.key === key ? state.error : "",
    hasCurrentData: Boolean(data),
    reload: () => { forceRefresh.current = true; setAttempt(value => value + 1); }
  };
}
