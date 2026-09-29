import { useCallback, useEffect, useState } from "react";
import { clearDashboardCache, getDashboardData } from "../services/api";

const dashboardState = new Map();
const pending = new Map();
const listeners = new Map();
const DASHBOARD_STORAGE_PREFIX = "childcare-dashboard:v2:";
const POLL_INTERVAL_MS = 60 * 1000;

function getEntry(key) {
  if (!dashboardState.has(key)) {
    let data = null;
    try { data = JSON.parse(window.localStorage.getItem(DASHBOARD_STORAGE_PREFIX + key)); } catch { /* Storage is optional. */ }
    dashboardState.set(key, { data, loading: !data, refreshing: false, error: "", updatedAt: 0 });
  }
  return dashboardState.get(key);
}

function publish(key, changes) {
  const entry = { ...getEntry(key), ...changes };
  dashboardState.set(key, entry);
  listeners.get(key)?.forEach(listener => listener(entry));
}

async function loadDashboard(key, { force = false, automatic = false } = {}) {
  if (pending.has(key)) {
    if (!force) return pending.get(key);
    await pending.get(key);
    if (pending.has(key)) return pending.get(key);
  }
  const entry = getEntry(key);
  if (automatic && Date.now() - entry.updatedAt < POLL_INTERVAL_MS) return;
  publish(key, { loading: !entry.data, refreshing: true, error: "" });
  const job = (async () => {
    try {
      // Only an explicit refresh invalidates the shared Google Sheets cache.
      if (force) await clearDashboardCache();
      const data = await getDashboardData({ ...JSON.parse(key), _force: true });
      try { window.localStorage.setItem(DASHBOARD_STORAGE_PREFIX + key, JSON.stringify(data)); } catch { /* Keep the memory cache. */ }
      publish(key, { data, updatedAt: Date.now() });
    } catch (error) {
      publish(key, { error: error.message || "Unable to load dashboard" });
    } finally {
      pending.delete(key);
      publish(key, { loading: false, refreshing: false });
    }
  })();
  pending.set(key, job);
  return job;
}

export function useDashboard(filters = {}) {
  const cacheKey = JSON.stringify(Object.fromEntries(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))));
  const [, setState] = useState(() => getEntry(cacheKey));
  const load = useCallback(options => loadDashboard(cacheKey, options), [cacheKey]);

  useEffect(() => {
    if (!listeners.has(cacheKey)) listeners.set(cacheKey, new Set());
    listeners.get(cacheKey).add(setState);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void load({ automatic: true });
    };
    refreshWhenVisible();
    const intervalId = window.setInterval(refreshWhenVisible, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    return () => {
      listeners.get(cacheKey)?.delete(setState);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
    };
  }, [cacheKey, load]);

  return { ...getEntry(cacheKey), reload: load };
}
