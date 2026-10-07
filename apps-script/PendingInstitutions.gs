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
  return { success: true, data: dataset.rows.filter(isPendingInstitution_).reverse().map(row => {
    const item = { rowNumber: row.rowNumber, identity: responseIdentity_(row, dataset.headers) };
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
    sheet.getRange(rowNumber, 1, 1, 4).setValues([values.map(safeCellText_)]);
    SpreadsheetApp.flush();
    PropertiesService.getScriptProperties().setProperty("CHILDCARE_RESPONSE_CACHE_REVISION", Utilities.getUuid());
    return { success: true, rowNumber: rowNumber };
  } finally { lock.releaseLock(); }
}
