function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || "").trim();
    validateRequest_(action, params);

    switch (action) {
      case "getDashboardData":
        return jsonResponse(getDashboardData(params));
      case "getInstitutions":
        return jsonResponse(getInstitutions(params));
      case "getSurveyResponses":
        return jsonResponse(getSurveyResponses(params));
      case "listUsers":
        return jsonResponse(listUsers_(params));
      case "listAccountRequests":
        return jsonResponse(listAccountRequests_(params));
      case "listRequestOffices":
        return jsonResponse({ success: true, offices: getOCCOfficeGroups_().map(office => office.name).filter(Boolean).sort() });
      case "clearDashboardCache":
        clearDashboardCache();
        return jsonResponse({ success: true, message: "Dashboard cache cleared." });
      default:
        return jsonResponse({ success: false, message: "Unknown action." });
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, message: error.message });
  }
}

function getUsersRegister_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) throw new Error("Users sheet not found.");
  // getDataRange() can include thousands of blank, formatted rows. The user
  // directory only needs rows that contain actual account data.
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) throw new Error("Users sheet is empty.");
  const rows = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headers = (rows.shift() || []).map(value => value.trim().toLowerCase());
  const columns = Object.fromEntries(["email", "password", "name", "office", "role"].map(header => [header, headers.indexOf(header)]));
  if (Object.values(columns).some(index => index < 0)) throw new Error("Users sheet must have Email, Password, Name, Office and Role headers.");
  return { sheet, rows, columns };
}

// Authentication is on the critical path. Do not use getDataRange() here:
// a Users sheet can have a large used range from formatting or old records,
// even though login only needs its user columns. Reading only those columns keeps
// sign-in fast as the workbook grows.
function findLoginUser_(email, password) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) throw new Error("Users sheet not found.");

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return null;

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(value => String(value).trim().toLowerCase());
  const columns = Object.fromEntries(["email", "password", "name", "office", "role"]
    .map(header => [header, headers.indexOf(header)]));
  if (["email", "password", "name", "office"].some(header => columns[header] < 0)) {
    throw new Error("Users sheet must have Email, Password, Name and Office headers.");
  }

  const rowCount = lastRow - 1;
  const requiredColumns = Object.values(columns).filter(column => column >= 0);
  const firstColumn = Math.min.apply(null, requiredColumns);
  const lastRequiredColumn = Math.max.apply(null, requiredColumns);
  // Let Sheets perform the indexed exact-match search. Reading every email into
  // Apps Script was the slowest part of sign-in when a formatted Users sheet
  // had thousands of rows. The password is still read live for the one match,
  // so password changes and revocations take effect immediately.
  const match = sheet.getRange(2, columns.email + 1, rowCount, 1)
    .createTextFinder(email).matchCase(false).matchEntireCell(true).findNext();
  if (match) {
    const row = sheet.getRange(match.getRow(), firstColumn + 1, 1, lastRequiredColumn - firstColumn + 1).getDisplayValues()[0];
    const user = {
    email: String(row[columns.email - firstColumn] || "").trim().toLowerCase(),
    password: String(row[columns.password - firstColumn] || ""),
    name: String(row[columns.name - firstColumn] || "").trim(),
    office: String(row[columns.office - firstColumn] || "").trim(),
    role: columns.role >= 0 ? String(row[columns.role - firstColumn] || "").trim() : ""
    };
    if (user.email === email && user.password === password) return user;
  }
  return null;
}

function normalizeRole_(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, " ") === "super admin" ? "super_admin" : "admin";
}

function assertSuperAdmin_(actorEmail, rows, columns) {
  const email = String(actorEmail || "").trim().toLowerCase();
  const actor = rows.find(row => String(row[columns.email] || "").trim().toLowerCase() === email);
  if (!actor || normalizeRole_(actor[columns.role]) !== "super_admin") throw new Error("Only a current super admin can manage users.");
}

function listUsers_(params) {
  const { rows, columns } = getUsersRegister_();
  assertSuperAdmin_(params.actorEmail, rows, columns);
  const users = rows.filter(row => String(row[columns.email] || "").trim()).map(row => ({
    email: String(row[columns.email] || "").trim(),
    name: String(row[columns.name] || "").trim(),
    office: String(row[columns.office] || "").trim(),
    role: normalizeRole_(row[columns.role])
  }));
  return { success: true, users };
}

function getAccountRequestsSheet_(spreadsheet) {
  const ss = spreadsheet || SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNT_REQUESTS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.ACCOUNT_REQUESTS);
    sheet.getRange(1, 1, 1, 4).setValues([["Name", "CHED Email", "Office", "Requested At"]]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function listAccountRequests_(params) {
  const { rows, columns } = getUsersRegister_();
  assertSuperAdmin_(params.actorEmail, rows, columns);
  const sheet = getAccountRequestsSheet_();
  const values = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getDisplayValues();
  return { success: true, requests: values.filter(row => String(row[1] || "").trim()).map((row, index) => ({
    row: index + 2, name: String(row[0] || "").trim(), email: String(row[1] || "").trim().toLowerCase(),
    office: String(row[2] || "").trim(), requestedAt: String(row[3] || "").trim()
  })) };
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents || "{}");
    const action = String(params.action || "login").trim();
    validateRequest_(action, params);
    if (action === "checkAccountRequest") return checkAccountRequest_(params);
    if (action === "submitAccountRequest") return submitAccountRequest_(params);
    if (action === "createUser") return createUser_(params);
    if (action === "updateUser") return updateUser_(params);
    if (action === "deleteUser") return deleteUser_(params);
    if (action === "approveAccountRequest") return approveAccountRequest_(params);
    if (action !== "login") throw new Error("Unknown action.");
    const email = String(params.email || "").trim().toLowerCase();
    const password = String(params.password || "");
    if (!email || !password) return jsonResponse({ success: false, message: "Invalid email or password." });
    const user = findLoginUser_(email, password);
    const roleValue = user ? user.role.toLowerCase().replace(/[\s_-]+/g, " ") : "";
    return user
      ? jsonResponse({ success: true, user: {
          email: user.email,
          name: user.name,
          office: user.office,
          role: roleValue === "super admin" ? "super_admin" : "admin"
        } })
      : jsonResponse({ success: false, message: "Invalid email or password." });
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, message: error.message });
  }
}

function checkAccountRequest_(params) {
  const email = String(params.email || "").trim().toLowerCase();
  const name = String(params.name || "").trim();
  const office = String(params.office || "").trim();
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.ACCOUNT_REQUESTS);
  const lastRow = sheet ? sheet.getLastRow() : 0;
  const rows = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
  const found = rows.some(row => String(row[1]).trim().toLowerCase() === email
    && String(row[0]).trim() === name && String(row[2]).trim() === office);
  return jsonResponse({ success: found, message: found ? "Your account request has been sent to the Super Admin." : "Your request could not yet be confirmed. Please try again shortly." });
}

function submitAccountRequest_(params) {
  const name = String(params.name || "").trim();
  const email = String(params.email || "").trim().toLowerCase();
  const office = String(params.office || "").trim();
  if (!name || !office || !/^[^\s@]+@ched\.gov\.ph$/.test(email)) return jsonResponse({ success: false, message: "Enter your name, a valid @ched.gov.ph email, and office." });
  const lock = LockService.getScriptLock();
  // Account requests are independent. Do not make a visitor wait ten seconds
  // behind an unrelated write; they can retry promptly if one is in progress.
  if (!lock.tryLock(1500)) return jsonResponse({ success: false, message: "Another account request is being saved. Please try again in a moment." });
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const users = spreadsheet.getSheetByName(CONFIG.SHEETS.USERS);
    if (!users) throw new Error("Users sheet not found.");
    const lastColumn = users.getLastColumn();
    if (!lastColumn) throw new Error("Users sheet is empty.");
    const headers = users.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    const emailColumn = headers.findIndex(value => String(value).trim().toLowerCase() === "email");
    if (emailColumn < 0) throw new Error("Users sheet must have an Email header.");
    const userLastRow = users.getLastRow();
    if (userLastRow >= 2 && users.getRange(2, emailColumn + 1, userLastRow - 1, 1)
      .createTextFinder(email).matchCase(false).matchEntireCell(true).findNext()) {
      return jsonResponse({ success: false, message: "An account already exists for this email." });
    }
    const sheet = getAccountRequestsSheet_(spreadsheet);
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2 && sheet.getRange(2, 2, lastRow - 1, 1)
      .createTextFinder(email).matchCase(false).matchEntireCell(true).findNext()) {
      return jsonResponse({ success: false, message: "An account request for this email is already pending." });
    }
    sheet.appendRow([safeCellText_(name), email, safeCellText_(office), new Date()]);
    SpreadsheetApp.flush(); // Commit before releasing the duplicate-check lock.
    return jsonResponse({ success: true, message: "Your account request has been sent to the Super Admin." });
  } finally { lock.releaseLock(); }
}

function approveAccountRequest_(params) {
  const requestRow = Number(params.requestRow);
  const email = String(params.email || "").trim().toLowerCase();
  const name = String(params.name || "").trim(); const office = String(params.office || "").trim();
  const password = String(params.password || ""); const role = String(params.role || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!Number.isInteger(requestRow) || requestRow < 2 || !name || !office || !/^[^\s@]+@ched\.gov\.ph$/.test(email) || password.length < 8 || !["admin", "super admin"].includes(role)) return jsonResponse({ success: false, message: "Enter a valid account, role, and password of at least 8 characters." });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const { sheet, rows, columns } = getUsersRegister_(); assertSuperAdmin_(params.actorEmail, rows, columns);
    const requestSheet = getAccountRequestsSheet_();
    if (requestRow > requestSheet.getLastRow() || String(requestSheet.getRange(requestRow, 2).getDisplayValue()).trim().toLowerCase() !== email) return jsonResponse({ success: false, message: "This request is no longer pending. Refresh the list." });
    if (rows.some(row => String(row[columns.email] || "").trim().toLowerCase() === email)) return jsonResponse({ success: false, message: "An account already exists for this email." });
    const values = Array(sheet.getLastColumn()).fill(""); values[columns.email] = email; values[columns.password] = safeCellText_(password); values[columns.name] = safeCellText_(name); values[columns.office] = safeCellText_(office); values[columns.role] = role === "super admin" ? "Super Admin" : "Admin";
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setNumberFormat("@").setValues([values]);
    requestSheet.deleteRow(requestRow);
    return jsonResponse({ success: true, message: "Request approved and account created.", user: { email, name, office, role: normalizeRole_(role) } });
  } finally { lock.releaseLock(); }
}

function createUser_(params) {
  const email = String(params.email || "").trim().toLowerCase();
  const password = String(params.password || "");
  const name = String(params.name || "").trim();
  const office = String(params.office || "").trim();
  const role = String(params.role || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!/^[^\s@]+@ched\.gov\.ph$/.test(email) || !name || !office || password.length < 8 || !["admin", "super admin"].includes(role)) {
    return jsonResponse({ success: false, message: "Use a @ched.gov.ph email and enter a name, office, password of at least 8 characters, and role." });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { sheet, rows, columns } = getUsersRegister_();
    assertSuperAdmin_(params.actorEmail, rows, columns);
    if (rows.some(row => String(row[columns.email] || "").trim().toLowerCase() === email)) {
      return jsonResponse({ success: false, message: "A user with this email already exists." });
    }
    const values = Array(sheet.getLastColumn()).fill("");
    values[columns.email] = email;
    values[columns.password] = safeCellText_(password);
    values[columns.name] = safeCellText_(name);
    values[columns.office] = safeCellText_(office);
    values[columns.role] = role === "super admin" ? "Super Admin" : "Admin";
    const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length);
    target.setNumberFormat("@");
    target.setValues([values]);
    return jsonResponse({ success: true, message: "User added successfully.", user: { email, name, office, role: normalizeRole_(role) } });
  } finally {
    lock.releaseLock();
  }
}

function safeCellText_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function updateUser_(params) {
  const targetEmail = String(params.targetEmail || "").trim().toLowerCase();
  const email = String(params.email || "").trim().toLowerCase();
  const name = String(params.name || "").trim();
  const office = String(params.office || "").trim();
  const password = String(params.password || "");
  const role = String(params.role || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!/^[^\s@]+@ched\.gov\.ph$/.test(email) || !name || !office || !["admin", "super admin"].includes(role) || (password && password.length < 8)) {
    return jsonResponse({ success: false, message: "Enter a valid CHED email, name, office, role, and password of at least 8 characters if changing it." });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { sheet, rows, columns } = getUsersRegister_();
    assertSuperAdmin_(params.actorEmail, rows, columns);
    const index = rows.findIndex(row => String(row[columns.email] || "").trim().toLowerCase() === targetEmail);
    if (index < 0) return jsonResponse({ success: false, message: "User no longer exists. Refresh the list." });
    if (rows.some((row, rowIndex) => rowIndex !== index && String(row[columns.email] || "").trim().toLowerCase() === email)) {
      return jsonResponse({ success: false, message: "A user with this email already exists." });
    }
    const actorEmail = String(params.actorEmail || "").trim().toLowerCase();
    const currentRole = normalizeRole_(rows[index][columns.role]);
    if (targetEmail === actorEmail && (email !== actorEmail || role !== "super admin")) {
      return jsonResponse({ success: false, message: "You cannot change your own email or super admin role." });
    }
    if (currentRole === "super_admin" && role !== "super admin" && rows.filter(row => normalizeRole_(row[columns.role]) === "super_admin").length <= 1) {
      return jsonResponse({ success: false, message: "At least one super admin must remain." });
    }
    const rowNumber = index + 2;
    [[columns.email, email], [columns.name, name], [columns.office, office], [columns.role, role === "super admin" ? "Super Admin" : "Admin"]]
      .forEach(([column, value]) => sheet.getRange(rowNumber, column + 1).setNumberFormat("@").setValue(safeCellText_(value)));
    if (password) sheet.getRange(rowNumber, columns.password + 1).setNumberFormat("@").setValue(safeCellText_(password));
    return jsonResponse({ success: true, message: "User updated successfully.", user: { email, name, office, role: normalizeRole_(role) } });
  } finally {
    lock.releaseLock();
  }
}

function deleteUser_(params) {
  const targetEmail = String(params.targetEmail || "").trim().toLowerCase();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const { sheet, rows, columns } = getUsersRegister_();
    assertSuperAdmin_(params.actorEmail, rows, columns);
    const index = rows.findIndex(row => String(row[columns.email] || "").trim().toLowerCase() === targetEmail);
    if (index < 0) return jsonResponse({ success: false, message: "User no longer exists. Refresh the list." });
    if (targetEmail === String(params.actorEmail || "").trim().toLowerCase()) {
      return jsonResponse({ success: false, message: "You cannot delete your own account." });
    }
    if (normalizeRole_(rows[index][columns.role]) === "super_admin" && rows.filter(row => normalizeRole_(row[columns.role]) === "super_admin").length <= 1) {
      return jsonResponse({ success: false, message: "At least one super admin must remain." });
    }
    sheet.deleteRow(index + 2);
    return jsonResponse({ success: true, message: "User deleted successfully." });
  } finally {
    lock.releaseLock();
  }
}

function validateRequest_(action, params) {
  if (!action) throw new Error("Missing action.");

  const allowedActions = {
    getDashboardData: true,
    getInstitutions: true,
    getSurveyResponses: true,
    listUsers: true,
    clearDashboardCache: true,
    login: true,
    createUser: true,
    updateUser: true,
    deleteUser: true
    ,submitAccountRequest: true,
    checkAccountRequest: true,
    listAccountRequests: true,
    listRequestOffices: true,
    approveAccountRequest: true
  };
  if (!allowedActions[action]) throw new Error("Unknown action.");

  if (["listUsers", "createUser", "updateUser", "deleteUser", "listAccountRequests", "approveAccountRequest"].includes(action) && !CONFIG.API_ACCESS_CODE) {
    throw new Error("Configure API_ACCESS_CODE before managing users.");
  }

  if (CONFIG.API_ACCESS_CODE) {
    const code = String(params.code || "");
    if (code !== CONFIG.API_ACCESS_CODE) throw new Error("Unauthorized request.");
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
