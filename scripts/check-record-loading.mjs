import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import handler from "../api/sheet.js";

const env = { VITE_SHEET_API_URL: "https://script.google.com/macros/s/test/exec" };
function response() {
  return { setHeader() {}, status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; } };
}
const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1 ? new Response("", { status: 404 })
      : Response.json({ success: true, data: [{ rowNumber: 2 }], total: 1 });
  };
  const res = response();
  await handler({ method: "GET", url: "/?action=getInstitutions" }, res, env);
  assert.equal(res.code, 200);
  assert.equal(calls, 2);
  assert.equal(res.payload.data.length, 1);
  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) throw new DOMException("Timed out", "AbortError");
    return Response.json({ success: true, data: [] });
  };
  const stalled = response();
  await handler({ method: "GET", url: "/?action=getInstitutions" }, stalled, env);
  assert.equal(stalled.code, 200);
  assert.equal(calls, 2);
  globalThis.fetch = async () => new Response("bad response", { status: 200 });
  const invalid = response();
  await handler({ method: "GET", url: "/?action=getInstitutions" }, invalid, env);
  assert.equal(invalid.code, 502);
} finally { globalThis.fetch = originalFetch; }

// Exercise the browser service without a browser: route changes must share a
// request, failed responses must not be cached, and refresh must invalidate data.
let calls = 0;
const context = vm.createContext({
  URL, AbortController, DOMParser: class {}, console,
  window: { location: { origin: "http://localhost" }, setTimeout, clearTimeout },
  fetch: async () => { calls++; return Response.json({ success: true, data: [], total: 0 }); }
});
const service = readFileSync("src/services/api.js", "utf8")
  .replace(/import .*?;\s*/, "")
  .replaceAll("import.meta.env", "({VITE_SHEET_API_URL:'https://script.google.com/macros/s/test/exec',PROD:false})")
  .replaceAll("export ", "");
vm.runInContext(service, context);
await vm.runInContext("Promise.all([getInstitutions({page:1,pageSize:20}),getSurveyResponses({page:1,pageSize:20})])", context);
assert.equal(calls, 1);
await vm.runInContext("getSurveyResponses({page:1,pageSize:20})", context);
assert.equal(calls, 1);
assert.ok(vm.runInContext("peekInstitutionPage({page:1,pageSize:20})", context));
await vm.runInContext("clearDashboardCache()", context);
assert.equal(vm.runInContext("peekInstitutionPage({page:1,pageSize:20})", context), null);
context.fetch = async () => { calls++; return Response.json({ message: "Unavailable" }, { status: 502 }); };
await assert.rejects(vm.runInContext("getInstitutions({page:2,pageSize:20})", context), /Unavailable/);
assert.equal(vm.runInContext("peekInstitutionPage({page:2,pageSize:20})", context), null);

const backend = vm.createContext({
  getRawDataset_: () => ({ headers: [], rows: [
    { rowNumber: 2, "HEI": "Alpha", "Name of Institution Campus": "A", "SUC/LUC": "SUC" },
    { rowNumber: 3, "HEI": "Beta", "Name of Institution Campus": "B", "SUC/LUC": "LUC" }
  ] }),
  headerValue_: (row, key) => row[key] ?? ""
});
vm.runInContext(readFileSync("apps-script/Dashboard.gs", "utf8"), backend);
const page = vm.runInContext("buildInstitutionsPage_(1,1,'')", backend);
assert.equal(page.data[0].rowNumber, 3);
assert.equal(page.total, 2);
assert.equal(page.institutionCount, 2);
assert.equal(vm.runInContext("buildInstitutionsPage_(1,20,'alpha').total", backend), 1);
assert.equal(vm.runInContext("buildInstitutionsPage_(1,20,'missing').total", backend), 0);
console.log("PASS: redirect retry, invalid response handling, shared request/cache, refresh invalidation, backend pagination/search.");
