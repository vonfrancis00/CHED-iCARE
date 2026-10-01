import { useEffect, useMemo, useRef, useState } from "react";
import { getInstitutions, getSheetDataRevision, peekInstitutionPage } from "../services/api";

const STORAGE_PREFIX = "childcare-institution-groups:v3:";
const SOURCE = import.meta.env.VITE_SHEET_API_URL || "demo";
const entries = new Map();
const pending = new Map();

async function readPage(params) {
  try {
    return await getInstitutions(params);
  } catch (error) {
    // Retry only a transient read failure, once. Authentication and invalid
    // payload errors need user attention rather than another request.
    if (![408, 429, 502, 503, 504].includes(error.status) && error.name !== "TypeError") throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getInstitutions(params);
  }
}

function readEntry(key, params) {
  if (entries.has(key)) return entries.get(key);
  try {
    const entry = JSON.parse(window.localStorage.getItem(STORAGE_PREFIX + key));
    // Show saved records immediately; freshness controls background refresh,
    // not whether the user can see the last successful result.
    if (entry && Array.isArray(entry.data?.data)) {
      // A revision only has meaning within the current browser execution.
      entry.revision = -1;
      entries.set(key, entry);
      return entry;
    }
  } catch { /* Storage may be unavailable. */ }
  // Login prefetch uses the same first page for both record views. Render it
  // immediately instead of showing a spinner until the loading effect runs.
  const first = params && peekInstitutionPage({ ...params, page: 1 });
  if (first && Array.isArray(first.data)) {
    const entry = { data: first, revision: getSheetDataRevision(), complete: Number(first.total ?? first.data.length) <= first.data.length, savedAt: Date.now() };
    entries.set(key, entry);
    return entry;
  }
  return null;
}

function canReuseEntry(entry, revision, force = false) {
  // Keep completed results for this session. Explicit refresh/revision changes
  // still fetch new data; saved snapshots revalidate after a browser reload.
  return !force && entry?.complete && entry.revision === revision;
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
  const available = readEntry(key, params);
  if (canReuseEntry(available, revision, force)) {
    publish(available);
    return { listeners: new Set(), promise: Promise.resolve() };
  }
  if (pending.has(key)) {
    const job = pending.get(key);
    job.listeners.add(publish);
    return job;
  }
  const job = { listeners: new Set([publish]) };
  pending.set(key, job);
  job.promise = (async () => {
    // Publish the first batch immediately, then keep filling the cache.
    const requestParams = { pageSize: 50, ...params, _force: force };
    const first = await readPage({ ...requestParams, page: 1 });
    if (!Array.isArray(first.data)) throw new Error("The data service returned invalid records. Please retry.");
    const total = Number(first.total) || first.data.length;
    let data = { ...first, total };
    // Older deployments may cap page size. Continue at their actual size so
    // subsequent requests cannot skip responses.
    const pageSize = Number(first.pageSize) > 0 ? Number(first.pageSize) : first.data.length;
    if (total > 0 && pageSize === 0) throw new Error("The data service returned incomplete records. Please retry.");
    if (first.data.length !== Math.min(pageSize, total)) {
      throw new Error("The data service returned incomplete records. Please retry.");
    }
    requestParams.pageSize = pageSize || requestParams.pageSize;
    const pages = total ? Math.ceil(total / requestParams.pageSize) : 0;
    const publishData = complete => {
      // Keep the complete directory visible until its replacement is ready.
      if (!complete && readEntry(key)?.complete) return;
      const entry = saveEntry(key, data, revision, complete);
      job.listeners.forEach(listener => listener(entry));
    };
    publishData(pages <= 1);
    // Save each successful page before requesting the next. This avoids
    // concurrent Apps Script reads and losing a whole batch to one timeout.
    for (let page = 2; page <= pages; page++) {
      const next = await readPage({ ...requestParams, page });
      if (!Array.isArray(next.data)) throw new Error("The data service returned invalid records. Please retry.");
      if (next.data.length !== Math.min(requestParams.pageSize, total - data.data.length)) {
        throw new Error("The data service returned incomplete records. Please retry.");
      }
      data = { ...data, data: data.data.concat(next.data) };
      publishData(page === pages);
    }
  })().finally(() => pending.delete(key));
  return job;
}

function filterDirectory(data, query, institutionType, region) {
  if (!data) return data;
  const name = query.trim().toLowerCase();
  const type = institutionType.trim().toUpperCase();
  const area = region.trim().toLowerCase();
  if (!name && !type && !area) return data;
  const rows = data.data.filter(row =>
    (!name || String(row.Institution || "").toLowerCase().includes(name)) &&
    (!type || String(row["SUC/LUC"] || "").trim().toUpperCase() === type) &&
    (!area || String(row.Region || "").trim().toLowerCase() === area)
  );
  return { ...data, data: rows, total: rows.length };
}

export function useInstitutionGroups(query, institutionType, region, pageSize = 50) {
  // All views and search terms share one directory load. Typing must not start
  // competing Google reads or discard records already available locally.
  const params = { query: "", institutionType: "", region: "", pageSize };
  const key = JSON.stringify([SOURCE, params.query, params.institutionType, params.region, pageSize]);
  const revision = getSheetDataRevision();
  const [attempt, setAttempt] = useState(0);
  const forceRefresh = useRef(false);
  const [state, setState] = useState(() => ({ key, data: readEntry(key, params)?.data, loading: !readEntry(key, params), error: "" }));
  const cached = readEntry(key, params);

  useEffect(() => {
    let active = true;
    let job;
    const available = readEntry(key);
    const force = forceRefresh.current;
    forceRefresh.current = false;
    setState({ key, data: available?.data, loading: true, error: "" });
    if (canReuseEntry(available, revision, force)) {
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

  const directory = cached?.data || (state.key === key ? state.data : null);
  const data = useMemo(() => filterDirectory(directory, query, institutionType, region), [directory, query, institutionType, region]);
  return {
    data,
    loading: !data && (state.key !== key || state.loading),
    backgroundLoading: Boolean(data) && (state.key !== key || state.loading),
    error: state.key === key ? state.error : "",
    hasCurrentData: Boolean(data),
    reload: () => { forceRefresh.current = true; setAttempt(value => value + 1); }
  };
}
