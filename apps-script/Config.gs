
const CONFIG = {
  SPREADSHEET_ID: getScriptProperty_("SPREADSHEET_ID", "1MrOU3ydtDTi5nAD4KGf6MQLfopMjfRl7-yGePeJxSWA"),
  SHEETS: {
    RESPONSES: "Form Responses 1",
    OCC: "Per OCC",
    USERS: "Users",
    ACCOUNT_REQUESTS: "Account Requests"
  },
  CACHE_SECONDS: 300,
  MAX_RESPONSE_ROWS: 5000,
  API_ACCESS_CODE: getScriptProperty_("API_ACCESS_CODE", "")
};

function getScriptProperty_(name, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  return value || fallback;
}
