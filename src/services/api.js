
import { demoDashboard, demoInstitutions } from "../data/demoData";

const API_URL = import.meta.env.VITE_SHEET_API_URL?.trim();
const API_ACCESS_CODE = import.meta.env.VITE_SHEET_API_ACCESS_CODE?.trim();
const API_TIMEOUT_MS = 90000;
const CLIENT_CACHE_MS = 5 * 60000;
const responseCache = new Map();

async function request(action, params = {}) {
  if (!API_URL) {
    return demoResponse_(action);
  }

  const url = buildApiUrl_(action, params, { includeCode: true });

  const cacheKey = url.toString();
  const canCache = action !== "clearDashboardCache";
  const cached = responseCache.get(cacheKey);
  if (canCache && cached && Date.now() - cached.createdAt < CLIENT_CACHE_MS) {
    return cached.promise;
  }

  const promise = fetchWithFallback_(url, action, params);
  if (canCache) {
    responseCache.set(cacheKey, { createdAt: Date.now(), promise });
    promise.catch(() => responseCache.delete(cacheKey));
  }

  if (action === "clearDashboardCache") responseCache.clear();
  return promise;
}

function buildApiUrl_(action, params = {}, options = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
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

async function fetchWithFallback_(url, action, params) {
  try {
    return await fetchJson_(url, action);
  } catch (error) {
    if (API_ACCESS_CODE && shouldRetryWithoutCode_(error)) {
      try {
        return await fetchJson_(buildApiUrl_(action, params, { includeCode: false }), action);
      } catch (retryError) {
        throw retryError;
      }
    }

    throw error;
  }
}

async function fetchJson_(url, action) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("API request timed out. Check the Apps Script deployment URL, script properties, and web app deployment version.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const hint = response.status === 404
      ? " Apps Script returned 404; redeploy the Web App and use the latest /exec URL."
      : "";
    throw new Error(`API request failed: ${response.status}.${hint}`);
  }
  const json = await response.json();
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
}

function shouldRetryWithoutCode_(error) {
  const message = String(error?.message || "");
  return message.includes("404") || message.includes("Unauthorized");
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
export const getInstitutions = (params = {}) => request("getInstitutions", params);
export const getSurveyResponses = (params = {}) => request("getSurveyResponses", params);
export const clearDashboardCache = () => request("clearDashboardCache");
