
import { demoDashboard, demoInstitutions } from "../data/demoData";

const API_URL = import.meta.env.VITE_SHEET_API_URL?.trim();
const API_ACCESS_CODE = import.meta.env.VITE_SHEET_API_ACCESS_CODE?.trim();
// Allow a cold Google Sheet read to finish; timeouts are not retried automatically.
const API_TIMEOUT_MS = 60000;
const CLIENT_CACHE_MS = 15 * 1000;
const SURVEY_CACHE_MS = 5 * 60 * 1000;
const TRANSIENT_RETRY_ATTEMPTS = 2;
const responseCache = new Map();
const pendingRequests = new Map();

async function request(action, params = {}) {
  if (!API_URL) {
    if (import.meta.env.PROD) throw new Error("The production data source is not configured. Set VITE_SHEET_API_URL and rebuild the site.");
    return demoResponse_(action);
  }

  const url = buildApiUrl_(action, params, { includeCode: true });

  const cacheKey = url.toString();
  const canCache = action !== "clearDashboardCache";
  if (canCache && pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);
  const cached = responseCache.get(cacheKey);
  const cacheDuration = action === "getSurveyResponses" ? SURVEY_CACHE_MS : CLIENT_CACHE_MS;
  if (canCache && cached && Date.now() - cached.createdAt < cacheDuration) {
    return cached.promise;
  }

  const promise = fetchJson_(url, action).then(result => {
    if (canCache) responseCache.set(cacheKey, { createdAt: Date.now(), promise: Promise.resolve(result) });
    return result;
  }).finally(() => pendingRequests.delete(cacheKey));
  if (canCache) {
    pendingRequests.set(cacheKey, promise);
  }

  if (action === "clearDashboardCache") responseCache.clear();
  return promise;
}

function buildApiUrl_(action, params = {}, options = {}) {
  let url;
  try {
    url = new URL(API_URL);
  } catch {
    throw new Error("VITE_SHEET_API_URL must be a valid Apps Script Web App /exec URL.");
  }
  if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec\/?$/.test(url.pathname)) {
    throw new Error("VITE_SHEET_API_URL must use the stable https://script.google.com/macros/s/.../exec deployment URL, not a script.googleusercontent.com redirect URL.");
  }
  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (key.startsWith("_") || key === "action" || key === "code") return;
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  if (options.includeCode && API_ACCESS_CODE) {
    url.searchParams.set("code", API_ACCESS_CODE);
  }

  if (action === "clearDashboardCache") {
    url.searchParams.set("_t", Date.now().toString());
  }

  return url;
}

async function fetchJson_(url, action) {
  // ContentService redirects each call to a short-lived googleusercontent URL.
  // Do not cache that redirect, and retry a fresh redirect once if it expires.
  let lastError;
  const attempts = import.meta.env.PROD ? 1 : TRANSIENT_RETRY_ATTEMPTS;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchJsonOnce_(url, action);
    } catch (error) {
      lastError = error;
      if (!isTransientGoogleRedirectError_(error) || attempt === attempts - 1) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

async function fetchJsonOnce_(url, action) {
  const requestUrl = import.meta.env.PROD
    ? new URL(`/api/sheet${url.search}`, window.location.origin)
    : new URL(url);
  requestUrl.searchParams.set("_t", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl.toString(), {
      signal: controller.signal,
      cache: "no-store"
    });

  if (!response.ok) {
    const hint = response.status === 404
      ? " The data service could not return these records. Please retry."
      : "";
    const error = new Error(`API request failed: ${response.status}.${hint}`);
    // The server already waited for Google; do not repeat another full timeout.
    error.status = response.status === 504 ? 408 : response.status;
    throw error;
  }
  let json;
  try {
    json = await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Apps Script returned an invalid response. Confirm the Web App deployment runs the latest code and is accessible to this site.");
  }
  if (!json || typeof json !== "object") throw new Error("The data service returned an invalid response.");
  if (json.success === false) throw new Error(json.message || "Backend request failed");
  if (
    (action === "getInstitutions" || action === "getSurveyResponses") &&
    json.data &&
    !Array.isArray(json.data) &&
    Array.isArray(json.data.data)
  ) {
    return {
      ...json.data,
      success: json.success
    };
  }
  return json;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("The data service took too long to respond. Please retry.");
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function isTransientGoogleRedirectError_(error) {
  return [404, 429, 500, 502, 503, 504].includes(error?.status) || error instanceof TypeError;
}

async function demoResponse_(action, source = "demo") {
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (action === "getDashboardData") return { ...demoDashboard, source };
  if (action === "getInstitutions" || action === "getSurveyResponses") {
    return { success: true, headers: [], data: demoInstitutions, source };
  }
  return { success: true, source };
}

export const getDashboardData = (params = {}) => request("getDashboardData", params);
// Both pages use the full survey dataset. Use its working endpoint and share
// cached and in-flight requests so navigating between them does not reload it.
export const getInstitutions = (params = {}) => request("getSurveyResponses", params);
export const getSurveyResponses = (params = {}) => request("getSurveyResponses", params);
export const clearDashboardCache = () => request("clearDashboardCache");
