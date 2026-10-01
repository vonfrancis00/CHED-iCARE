const questions = {
  facilities: [
    "Do you currently have a childcare facility or center on your campus that is used by faculty and non-teaching personnel?",
    "Do you currently have a childcare facility or center on your campus that students use?",
    "Do you currently have a childcare facility or center on your campus that community members use?",
  ],
  programs: [
    "Do you currently have a documented childcare program for faculty and non-teaching personnel?",
    "Do you currently have a documented childcare program for students?",
    "Do you currently have a documented childcare program for community members?",
  ],
};
const clean = value => String(value ?? "").trim().replace(/\s+/g, " ");

export function summarizeParticipation(rows, institutionType = "", region = "") {
  return Object.fromEntries(Object.entries(questions).map(([kind, headers]) => {
    const regions = new Map();
    const institutions = new Map();
    for (const row of rows) {
      const fields = Object.fromEntries(Object.entries(row).map(([key, value]) => [clean(key).toLowerCase(), clean(value)]));
      const type = (fields["suc/luc"] || "").toUpperCase();
      const location = fields.region || "";
      if (institutionType && type !== institutionType) continue;
      if (region && location.toLowerCase() !== clean(region).toLowerCase()) continue;
      const count = headers.filter(header => fields[header.toLowerCase()]?.toLowerCase() === "yes").length;
      if (!count) continue;
      if (location && !["not specified", "n/a", "unknown"].includes(location.toLowerCase())) {
        const key = location.toLowerCase();
        const entry = regions.get(key) || { name: location, count: 0 };
        entry.count += count;
        regions.set(key, entry);
      }
      const name = fields.institution;
      if (name && ["SUC", "LUC"].includes(type)) {
        const key = `${type}:${name.toLowerCase()}`;
        const entry = institutions.get(key) || { name, type, count: 0 };
        entry.count += count;
        institutions.set(key, entry);
      }
    }
    const ranked = [...institutions.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return [kind, {
      regions: [...regions.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
      leaders: ranked.filter(item => item.count === ranked[0]?.count),
      rankings: ranked,
    }];
  }));
}
