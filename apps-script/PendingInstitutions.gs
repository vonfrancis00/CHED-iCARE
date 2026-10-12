function isPendingInstitution_(row) {
  const name = String(row.Institution || "").trim();
  return !name || /^unnamed institution$/i.test(name);
}

function responseIdentity_(row, headers) {
  // Exclude the four editable directory fields; include all original answers.
  const original = headers.filter(header => !["SUC/LUC", "Region", "Institution", "Campus"].includes(header))
    .map(header => [header, row[header]]);
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(original)));
}

function getPendingInstitutions_() {
  const dataset = buildRawDataset_(); // Read live so new form submissions appear.
  const fields = ["SUC/LUC", "Region", "Institution", "Campus", "Timestamp", "Name of Institution", "Name of Institution Campus", "Address of Campus"];
  return { success: true, sucOptions: pendingSUCOptions_().map(({ name, region }) => ({ name, region })), data: dataset.rows.filter(isPendingInstitution_).reverse().map(row => {
    const item = { rowNumber: row.rowNumber, identity: responseIdentity_(row, dataset.headers) };
    const editLock = readInstitutionLock_(item.identity);
    if (editLock) item.editing = { name: editLock.name, expiresAt: editLock.expiresAt };
    fields.forEach(field => { item[field] = row[field] || ""; });
    return item;
  }) };
}

function completeInstitution_(params) {
  const values = [params.institutionType, params.region, params.institution, params.campus].map(value => String(value || "").trim());
  if (values.some(value => !value || value.length > 500) || !["SUC", "LUC"].includes(values[0]) || /^unnamed institution$/i.test(values[2])) throw new Error("Complete all four required fields with a valid SUC/LUC and institution name.");
  const rowNumber = Number(params.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || !params.identity) throw new Error("Invalid response. Refresh notifications.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getResponseSheet_();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(value => String(value).trim());
    if (JSON.stringify(headers.slice(0, 4)) !== JSON.stringify(["SUC/LUC", "Region", "Institution", "Campus"])) throw new Error("The first four sheet columns must be SUC/LUC, Region, Institution, and Campus.");
    if (rowNumber > sheet.getLastRow()) throw new Error("This response has moved. Refresh notifications.");
    const cells = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    const row = {};
    headers.forEach((header, index) => { row[header] = normalizeCellForJson_(cells[index]); });
    if (responseIdentity_(row, headers) !== params.identity) throw new Error("This response has moved or changed. Refresh notifications before saving.");
    if (!isPendingInstitution_(row)) throw new Error("This institution has already been completed. Refresh notifications.");
    requireInstitutionLock_(params);
    const matches = values[0] === "SUC" ? pendingSUCOptions_().filter(item => item.name === values[2] && item.region === values[1]) : [];
    if (values[0] === "SUC" && !matches.length) throw new Error("Select a SUC and its region from the current Per OCC list.");
    const occSheet = matches.length ? getSpreadsheet_().getSheetByName(CONFIG.SHEETS.OCC) : null;
    const updated = [];
    try {
      matches.forEach(item => {
        occSheet.getRange(item.row, item.column).setValue(true);
        updated.push(item);
      });
      sheet.getRange(rowNumber, 1, 1, 4).setValues([values.map(safeCellText_)]);
    } catch (failure) {
      updated.forEach(item => occSheet.getRange(item.row, item.column).setValue(item.flag));
      throw failure;
    }
    SpreadsheetApp.flush();
    PropertiesService.getScriptProperties().deleteProperty("INSTITUTION_LOCK_" + params.identity);
    PropertiesService.getScriptProperties().setProperty("CHILDCARE_RESPONSE_CACHE_REVISION", Utilities.getUuid());
    return { success: true, rowNumber: rowNumber };
  } finally { lock.releaseLock(); }
}

function readInstitutionLock_(identity) {
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty("INSTITUTION_LOCK_" + identity);
  if (!raw) return null;
  const entry = JSON.parse(raw);
  return entry.expiresAt > Date.now() ? entry : null;
}

function requireInstitutionLock_(params) {
  const entry = readInstitutionLock_(params.identity);
  if (!entry || entry.email !== params.actorEmail || entry.token !== params.lockToken) throw new Error("Your editing reservation has expired or belongs to another editor. Reopen this response before saving.");
  return entry;
}

function institutionLock_(action, params) {
  if (!params.actorEmail || typeof params.identity !== "string" || !params.identity || params.identity.length > 500 || typeof params.lockToken !== "string" || !params.lockToken || params.lockToken.length > 100) throw new Error("Invalid editing reservation.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const key = "INSTITUTION_LOCK_" + params.identity;
    let entry = readInstitutionLock_(params.identity);
    if (action === "releaseInstitutionLock") {
      if (entry && entry.email === params.actorEmail && entry.token === params.lockToken) properties.deleteProperty(key);
      return { success: true };
    }
    if (action === "claimInstitution") {
      const dataset = buildRawDataset_();
      const row = dataset.rows.find(item => item.rowNumber === Number(params.rowNumber));
      if (!row || !isPendingInstitution_(row) || responseIdentity_(row, dataset.headers) !== params.identity) throw new Error("This response has changed or already been completed. Refresh notifications.");
      if (entry && (entry.email !== params.actorEmail || entry.token !== params.lockToken)) return { success: false, message: "Being edited by " + entry.name + ". Please choose another response." };
    } else {
      entry = requireInstitutionLock_(params);
    }
    entry = { email: params.actorEmail, name: String(params.actorName || params.actorEmail).slice(0, 500), token: params.lockToken, expiresAt: Date.now() + 180000 };
    properties.setProperty(key, JSON.stringify(entry));
    return { success: true, expiresAt: entry.expiresAt };
  } finally { lock.releaseLock(); }
}


function pendingSUCOptions_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.OCC);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.SHEETS.OCC);
  if (sheet.getLastRow() < 3 || sheet.getLastColumn() < 3) return [];
  const cells = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const items = [];
  for (let column = 0; column + 2 < cells[1].length; column += 4) {
    if (String(cells[1][column + 1]).trim().toUpperCase() !== "SUC" || String(cells[1][column + 2]).trim().toLowerCase() !== "survey") continue;
    for (let row = 2; row < cells.length; row++) {
      const name = String(cells[row][column + 1] || "").trim();
      const region = String(cells[row][column] || "").trim();
      if (name && region) items.push({ name, region, row: row + 1, column: column + 3, flag: cells[row][column + 2] });
    }
  }
  return items;
}
