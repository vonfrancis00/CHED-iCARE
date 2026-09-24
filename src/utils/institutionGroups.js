export function groupInstitutions(rows, institutionField = "HEI") {
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
