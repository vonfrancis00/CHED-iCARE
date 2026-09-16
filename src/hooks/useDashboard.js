
import { useCallback, useEffect, useState } from "react";
import { getDashboardData } from "../services/api";

const dashboardState = new Map();
const DASHBOARD_STORAGE_PREFIX = "childcare-dashboard:v2:";
const POLL_INTERVAL_MS = 5 * 60 * 1000;

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

  const load = useCallback(async () => {
    const cached = dashboardState.get(cacheKey);
    const stored = cached?.data ? null : getStoredData(cacheKey);
    const availableData = cached?.data ?? stored;
    try {
      setLoading(!availableData);
      setError("");
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
    }
  }, [cacheKey]);

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  return { data, loading, error, reload: load };
}
