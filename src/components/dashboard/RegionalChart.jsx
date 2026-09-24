
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import ChartCard from "./ChartCard";

const COLORS = ["#1d4ed8", "#2563eb", "#1e3a8a", "#38bdf8", "#4f46e5", "#0f172a"];

function wrapInstitutionName(name) {
  const words = String(name ?? "").trim().split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    // Split unusually long words too, so every label stays within its column.
    for (const part of word.match(/.{1,16}/g) || []) {
      if (line && `${line} ${part}`.length > 16) {
        lines.push(line);
        line = "";
      }
      line = line ? `${line} ${part}` : part;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function InstitutionTick({ x, y, payload }) {
  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill="#475569">
      {wrapInstitutionName(payload.value).map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : 16}>{line}</tspan>
      ))}
    </text>
  );
}

export default function RegionalChart({ data = [], groupedByInstitution = false, splitByType = false }) {
  const safeData = Array.isArray(data) ? data : [];
  const labelHeight = groupedByInstitution
    ? Math.max(48, ...safeData.map(item => wrapInstitutionName(item.name).length * 16 + 16))
    : 30;
  const segments = [
    { key: "luc", name: "LUC", color: "#1e3a8a" },
    { key: "suc", name: "SUC", color: "#38bdf8" },
    ...(safeData.some(item => item.other > 0) ? [{ key: "other", name: "Unspecified / Other", color: "#94a3b8" }] : []),
  ];
  const subtitle = groupedByInstitution
    ? "Institution names and their campus-response counts"
    : "Institution/Campus counts grouped by Region";

  return (
    <ChartCard title="Institution/Campus Location Distribution" subtitle={subtitle} className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-50/80"
      headerContent={splitByType && (
        <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm">
          {segments.map(segment => (
            <span key={segment.key} className="inline-flex items-center gap-1" style={{ color: segment.color }}>
              <span className="h-3 w-3" style={{ backgroundColor: segment.color }} aria-hidden="true" />
              {segment.name}
            </span>
          ))}
        </div>
      )}
    >
      <div className="chart-scroll" tabIndex={0} role="region" aria-label="Scrollable chart"><div style={{ height: groupedByInstitution ? 300 + labelHeight : 360, width: groupedByInstitution ? Math.max(200, safeData.length * 120 + 80) : "100%", minWidth: groupedByInstitution ? undefined : Math.max(440, safeData.length * 65 + 80), marginInline: "auto" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 18, right: 12, left: 4, bottom: 28 }}>
            <defs>
              <linearGradient id="regionalBarFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={labelHeight}
              angle={groupedByInstitution ? 0 : -18}
              textAnchor={groupedByInstitution ? "middle" : "end"}
              tick={groupedByInstitution ? <InstitutionTick /> : { fontSize: 11, fill: "#475569" }}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              cursor={{ fill: "rgba(14, 165, 233, 0.06)" }}
              contentStyle={{
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)",
                background: "rgba(255,255,255,0.95)",
              }}
            />
            {splitByType ? segments.map((segment, segmentIndex) => (
              <Bar key={segment.key} dataKey={segment.key} name={segment.name} stackId="campuses" barSize={42} fill={segment.color} stroke="#f8fafc" strokeWidth={1}>
                {safeData.map((entry, index) => (
                  <Cell key={`${entry.name || index}-${segment.key}`} radius={segments.slice(segmentIndex + 1).some(next => entry[next.key] > 0) ? [0, 0, 0, 0] : [10, 10, 0, 0]} />
                ))}
              </Bar>
            )) : <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={42} fill="url(#regionalBarFill)">
              {safeData.map((entry, index) => (
                <Cell key={`${entry.name || index}-bar`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>}
          </BarChart>
        </ResponsiveContainer>
      </div></div>
    </ChartCard>
  );
}
