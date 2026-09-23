
import { useCallback, useEffect, useState } from "react";
import { clearDashboardCache, getDashboardData } from "../services/api";

const dashboardState = new Map();
const DASHBOARD_STORAGE_PREFIX = "childcare-dashboard:v2:";
const POLL_INTERVAL_MS = 60 * 1000;

function getCacheKey(filters) {
  return JSON.stringify(filters || {});
}

function getStoredData(cacheKey) {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_PREFIX + cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredData(cacheKey, data) {
  try {
    window.localStorage.setItem(DASHBOARD_STORAGE_PREFIX + cacheKey, JSON.stringify(data));
  } catch {
    // Storage may be disabled or full; the in-memory cache still handles route changes.
  }
}

export function useDashboard(filters = {}) {
  const cacheKey = getCacheKey(filters);
  const cached = dashboardState.get(cacheKey);
  const stored = cached?.data ? null : getStoredData(cacheKey);
  const initialData = cached?.data ?? stored;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ force = false, bypassCache = false } = {}) => {
    const cached = dashboardState.get(cacheKey);
    const stored = cached?.data ? null : getStoredData(cacheKey);
    const availableData = cached?.data ?? stored;
    try {
      setLoading(!availableData);
      setRefreshing(true);
      if (availableData) setData(availableData);
      setError("");
      if (force) await clearDashboardCache();
      else if (bypassCache) await clearDashboardCache();
      const result = await getDashboardData(filters);
      dashboardState.set(cacheKey, { data: result });
      setStoredData(cacheKey, result);
      setData(result);
    } catch (err) {
      if (!availableData) {
        setData(null);
      }
      setError(err.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    // Hidden/offline tabs cannot use new results. Refresh when the user returns
    // instead of repeatedly calling Google while the browser is suspended.
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) load({ bypassCache: true });
    };
    refreshWhenVisible();
    const intervalId = window.setInterval(refreshWhenVisible, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
    };
  }, [load]);

  return { data, loading, refreshing, error, reload: load };
}
