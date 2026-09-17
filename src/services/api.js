
import { demoDashboard, demoInstitutions } from "../data/demoData";

const API_URL = import.meta.env.VITE_SHEET_API_URL?.trim();
const API_ACCESS_CODE = import.meta.env.VITE_SHEET_API_ACCESS_CODE?.trim();
// Allow a cold Google Sheet read to finish; timeouts are not retried automatically.
const API_TIMEOUT_MS = 60000;
const CLIENT_CACHE_MS = 15 * 1000;
const RECORD_CACHE_MS = 5 * 60 * 1000;
const responseCache = new Map();
const pendingRequests = new Map();
let sheetDataRevision = 0;

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
  const ttl = action === "getInstitutions" ? RECORD_CACHE_MS : CLIENT_CACHE_MS;
  if (canCache && cached && Date.now() - cached.createdAt < ttl) {
    return cached.promise;
  }

  const promise = fetchJson_(url, action).then(result => {
    if (action === "getInstitutions" && !Array.isArray(result.data)) {
      throw new Error("The data service returned invalid records. Please retry.");
    }
    if (canCache) {
      if (responseCache.size >= 100) responseCache.delete(responseCache.keys().next().value);
      responseCache.set(cacheKey, { createdAt: Date.now(), data: result, promise: Promise.resolve(result) });
    }
    return result;
  }).finally(() => pendingRequests.delete(cacheKey));
  if (canCache) {
    pendingRequests.set(cacheKey, promise);
  }

  if (action === "clearDashboardCache") {
    responseCache.clear();
    sheetDataRevision += 1;
  }
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

// The server owns retries and one shared deadline in both environments.
const fetchJson_ = (url, action) => fetchJsonOnce_(url, action);

async function fetchJsonOnce_(url, action) {
  // Both Vite development and the production host proxy this route. This keeps
  // Google's redirect and CORS behavior on the server instead of the browser.
  const requestUrl = new URL(`/api/sheet${url.search}`, window.location.origin);
  requestUrl.searchParams.set("_t", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl.toString(), {
      signal: controller.signal,
      cache: "no-store"
    });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const hint = response.status === 404
      ? " The data service could not return these records. Please retry."
      : "";
    const error = new Error(payload?.message || `API request failed: ${response.status}.${hint}`);
    // The server already waited for Google; do not repeat another full timeout.
    error.status = response.status === 504 ? 408 : response.status;
    throw error;
  }
  let json;
  const responseText = await response.text();
  try {
    json = JSON.parse(responseText);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    // Google returns HTML when a script fails before doGet can run. Parse it
    // without rendering it so the useful compiler error is not hidden.
    const document = new DOMParser().parseFromString(responseText, "text/html");
    document.querySelectorAll("script, style").forEach(node => node.remove());
    const message = (document.body.textContent || "").replace(/\s+/g, " ").trim();
    const scriptError = message.match(/(?:SyntaxError|ReferenceError|TypeError):.{1,350}/);
    if (scriptError) {
      throw new Error(`Apps Script failed: ${scriptError[0]} Check all backend files for duplicate declarations, then update the existing deployment to a new version.`);
    }
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
export const getInstitutions = (params = {}) => request("getInstitutions", params);
export const getSurveyResponses = (params = {}) => request("getInstitutions", params);
export const clearDashboardCache = () => request("clearDashboardCache");
export const getSheetDataRevision = () => sheetDataRevision;

// Both record pages use exactly the same keys, expiry and in-flight requests.
export function peekInstitutionPage(params) {
  if (!API_URL) return null;
  try {
    const cached = responseCache.get(buildApiUrl_("getInstitutions", params, { includeCode: true }).toString());
    return cached && Date.now() - cached.createdAt < RECORD_CACHE_MS ? cached.data : null;
  } catch { return null; }
}
