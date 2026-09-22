
function getSpreadsheet_() {
  // Reuse the workbook within this execution (dashboard reads two tabs).
  if (!getSpreadsheet_.instance) getSpreadsheet_.instance = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return getSpreadsheet_.instance;
}

function getResponseSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.RESPONSES);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.SHEETS.RESPONSES);
  return sheet;
}

function getRawDataset_() {
  // Store headers once instead of repeating long survey questions in every
  // cached row. Page builders retain their existing named-field interface.
  const packed = getOrBuildCache_(cacheKey_("DATASET_" + getResponseCacheRevision_()), () => {
    const dataset = buildRawDataset_();
    return {
      headers: dataset.headers, cachedAt: dataset.cachedAt,
      rows: dataset.rows.map(row => [row.rowNumber].concat(dataset.headers.map(header => row[header])))
    };
  });
  return {
    headers: packed.headers, cachedAt: packed.cachedAt, rowCount: packed.rows.length,
    rows: packed.rows.map(values => {
      const row = { rowNumber: values[0] };
      packed.headers.forEach((header, index) => { row[header] = values[index + 1]; });
      return row;
    })
  };
}

function buildRawDataset_() {
  const sheet = getResponseSheet_();
  const lastRow = Math.min(sheet.getLastRow(), (CONFIG.MAX_RESPONSE_ROWS || 5000) + 1);
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) return { headers: [], rows: [], rowCount: 0 };

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  if (!values.length) return { headers: [], rows: [] };

  const headers = values.shift().map(h => String(h == null ? "" : h).trim());

  const rows = values
    .map((row, i) => ({ row, rowNumber: i + 2 }))
    .filter(({ row }) => row.some(v => v !== "" && v !== null))
    .map(({ row, rowNumber }) => {
      const obj = { rowNumber };
      headers.forEach((header, index) => {
        obj[header] = normalizeCellForJson_(row[index]);
      });
      return obj;
    });

  return {
    headers,
    rows,
    rowCount: rows.length,
    cachedAt: new Date().toISOString()
  };
}

function normalizeCellForJson_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  return value == null ? "" : value;
}

function headerValue_(row, exactHeader) {
  return row[exactHeader] ?? "";
}

function number_(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text || /^nd$/i.test(text) || /^n\/?a$/i.test(text)) return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function classify_(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "yes") return "yes";
  if (text === "no") return "no";
  if (text.includes("plans on the work") || text.includes("plans in the work") || text.includes("plan")) return "planned";
  return "other";
}

function countQuestion_(rows, header) {
  const result = { yes: 0, no: 0, planned: 0, other: 0 };
  rows.forEach(row => result[classify_(headerValue_(row, header))]++);
  return result;
}

function countExactValue_(rows, header) {
  const counts = {};
  rows.forEach(row => {
    const value = String(headerValue_(row, header) || "").trim() || "(Blank)";
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sumNumeric_(rows, header) {
  return rows.reduce((sum, row) => sum + number_(headerValue_(row, header)), 0);
}

function cacheKey_(name) {
  return "CHILDCARE_DASHBOARD_EXACT_V7_" + name;
}

function getOrBuildCache_(key, builder, seconds) {
  const cache = CacheService.getScriptCache();
  const cached = readCache_(cache, key);
  if (cached !== null) return cached;

  // Read-only cache builds must not hold the account-write lock. Concurrent
  // misses may build twice; generation-specific chunks publish atomically.
  const value = builder();
  putCache_(cache, key, value, seconds);
  return value;
}

function readCache_(cache, key) {
  try {
    const manifest = cache.get(key);
    if (!manifest) return null;
    const entry = JSON.parse(manifest);
    if (Object.prototype.hasOwnProperty.call(entry, "value")) return entry.value;
    const { generation, chunks } = entry;
    if (!generation || !Number.isInteger(chunks) || chunks < 1 || chunks > 100) return null;
    const keys = Array.from({ length: chunks }, (_, index) => key + ":" + generation + ":" + index);
    const parts = cache.getAll(keys);
    if (keys.some(part => !parts[part])) return null;
    return JSON.parse(keys.map(part => parts[part]).join(""));
  } catch (error) {
    return null;
  }
}

function putCache_(cache, key, value, seconds) {
  try {
    // ASCII JSON makes character length equal byte length, including Unicode
    // responses. Each piece stays below CacheService's 100 KB per-value limit.
    const json = JSON.stringify(value).replace(/[\u007f-\uffff]/g, character => "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));
    const ttl = seconds || CONFIG.CACHE_SECONDS;
    // Most dashboards and pages fit in one entry: one read/write, no manifest.
    if (json.length < 89000) {
      cache.put(key, '{"value":' + json + '}', ttl);
      return;
    }
    const chunks = Math.ceil(json.length / 90000);
    if (chunks > 100) return;
    const generation = Utilities.getUuid();
    const parts = {};
    for (let index = 0; index < chunks; index++) {
      parts[key + ":" + generation + ":" + index] = json.slice(index * 90000, (index + 1) * 90000);
    }
    cache.putAll(parts, ttl);
    // Publish only after every piece is written; readers reject missing pieces.
    cache.put(key, JSON.stringify({ generation, chunks }), ttl);
  } catch (error) {
    console.warn("Cache skipped for " + key + ": " + error.message);
  }
}

function removeCaches_(keys) {
  const cache = CacheService.getScriptCache();
  keys.forEach(key => cache.remove(key));
}
