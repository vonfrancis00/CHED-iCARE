// Ignore formatting differences while preserving every letter and number.
// Do not use partial or fuzzy matching to grant office visibility.
export function institutionNameKey(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
}

export function matchesInstitutionSearch(name, query) {
  return institutionNameKey(name).includes(institutionNameKey(query));
}

export function filterOfficeResponses(rows, institutions) {
  const assigned = new Set(institutions.map(item => institutionNameKey(typeof item === "string" ? item : item?.name)).filter(Boolean));
  return rows.filter(row => assigned.has(institutionNameKey(row.Institution)));
}
