export function groupCampuses(rows) {
  const groups = new Map();
  rows.forEach((row, index) => {
    const name = String(row.Campus || "").trim();
    const normalized = name.replace(/\s+/g, " ");
    const key = normalized ? `campus:${normalized.toLowerCase()}` : `unnamed:${row.rowNumber ?? index}`;
    if (!groups.has(key)) groups.set(key, { key, name: normalized || "Campus not specified", rows: [] });
    groups.get(key).rows.push(row);
  });
  return [...groups.values()];
}

export function groupInstitutions(rows, institutionField = "Institution") {
  const groups = new Map();
  rows.forEach((row, index) => {
    const name = String(row[institutionField] || "").trim().replace(/\s+/g, " ");
    // Missing names do not establish that two responses are from one institution.
    const key = name ? `name:${name.toLowerCase()}` : `unnamed:${row.rowNumber ?? index}`;
    if (!groups.has(key)) groups.set(key, { key, name: name || "Unnamed institution", rows: [] });
    groups.get(key).rows.push(row);
  });
  return [...groups.values()];
}
