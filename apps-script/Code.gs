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

function validateRequest_(action, params) {
  if (!action) throw new Error("Missing action.");

  const allowedActions = {
    getDashboardData: true,
    getInstitutions: true,
    getSurveyResponses: true,
    clearDashboardCache: true
  };
  if (!allowedActions[action]) throw new Error("Unknown action.");

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
