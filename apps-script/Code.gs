function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || "").trim();
    validateRequest_(action, params);

    switch (action) {
      case "getDashboardData":
        return jsonResponse(getDashboardData());
      case "getInstitutions":
        return jsonResponse(getInstitutions(params));
      case "getSurveyResponses":
        return jsonResponse(getSurveyResponses(params));
      case "listUsers":
        return jsonResponse(listUsers_(params));
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
  const rows = sheet.getDataRange().getDisplayValues();
  const headers = (rows.shift() || []).map(value => value.trim().toLowerCase());
  const columns = Object.fromEntries(["email", "password", "name", "office", "role"].map(header => [header, headers.indexOf(header)]));
  if (Object.values(columns).some(index => index < 0)) throw new Error("Users sheet must have Email, Password, Name, Office and Role headers.");
  return { sheet, rows, columns };
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

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents || "{}");
    const action = String(params.action || "login").trim();
    validateRequest_(action, params);
    if (action === "createUser") return createUser_(params);
    if (action === "updateUser") return updateUser_(params);
    if (action === "deleteUser") return deleteUser_(params);
    if (action !== "login") throw new Error("Unknown action.");
    const email = String(params.email || "").trim().toLowerCase();
    const password = String(params.password || "");
    if (!email || !password) return jsonResponse({ success: false, message: "Invalid email or password." });
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) throw new Error("Users sheet not found.");
    const rows = sheet.getDataRange().getDisplayValues();
    const headers = (rows.shift() || []).map(value => value.trim().toLowerCase());
    const indices = ["email", "password", "name", "office"].map(name => headers.indexOf(name));
    if (indices.some(index => index < 0)) throw new Error("Users sheet must have Email, Password, Name and Office headers.");
    const roleIndex = headers.indexOf("role");
    const row = rows.find(values => String(values[indices[0]] || "").trim().toLowerCase() === email && String(values[indices[1]] || "") === password);
    const roleValue = row && roleIndex >= 0 ? String(row[roleIndex] || "").trim().toLowerCase().replace(/[\s_-]+/g, " ") : "";
    return row
      ? jsonResponse({ success: true, user: {
          email: row[indices[0]].trim(),
          name: row[indices[2]].trim(),
          office: row[indices[3]].trim(),
          role: roleValue === "super admin" ? "super_admin" : "admin"
        } })
      : jsonResponse({ success: false, message: "Invalid email or password." });
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, message: error.message });
  }
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
  };
  if (!allowedActions[action]) throw new Error("Unknown action.");

  if (["listUsers", "createUser", "updateUser", "deleteUser"].includes(action) && !CONFIG.API_ACCESS_CODE) {
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
