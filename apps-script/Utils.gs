
function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getResponseSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.RESPONSES);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.SHEETS.RESPONSES);
  return sheet;
}

function getRawDataset_() {
  return getOrBuildCache_(cacheKey_("DATASET"), () => buildRawDataset_());
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
  return "CHILDCARE_DASHBOARD_EXACT_V2_" + name;
}

function getOrBuildCache_(key, builder, seconds) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      const secondRead = cache.get(key);
      if (secondRead) return JSON.parse(secondRead);

      const value = builder();
      putCache_(cache, key, value, seconds);
      return value;
    } finally {
      lock.releaseLock();
    }
  }

  const value = builder();
  putCache_(cache, key, value, seconds);
  return value;
}

function putCache_(cache, key, value, seconds) {
  try {
    cache.put(key, JSON.stringify(value), seconds || CONFIG.CACHE_SECONDS);
  } catch (error) {
    console.warn("Cache skipped for " + key + ": " + error.message);
  }
}

function removeCaches_(keys) {
  const cache = CacheService.getScriptCache();
  keys.forEach(key => cache.remove(key));
}
