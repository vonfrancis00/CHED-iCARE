
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import ChartCard from "./ChartCard";

const COLORS = ["#1d4ed8", "#2563eb", "#1e3a8a", "#38bdf8", "#4f46e5", "#0f172a"];

export default function RegionalChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <ChartCard title="Campus Location Distribution" subtitle="Campus counts grouped by the sheet’s Region column" className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-50/80">
      <div className="h-[360px]">
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
              angle={-18}
              textAnchor="end"
              tick={{ fontSize: 11, fill: "#475569" }}
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
            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={42} fill="url(#regionalBarFill)">
              {safeData.map((entry, index) => (
                <Cell key={`${entry.name || index}-bar`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
