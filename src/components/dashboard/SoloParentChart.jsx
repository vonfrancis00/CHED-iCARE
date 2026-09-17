import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import ChartCard from "./ChartCard";

export default function SoloParentChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <ChartCard title="Solo Parent Statistics" subtitle="Reported female and male counts" className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-50/80">
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 12, right: 12, left: 4, bottom: 20 }}>
            <defs>
              <linearGradient id="soloFemale" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#5b4fcf" />
              </linearGradient>
              <linearGradient id="soloMale" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              shared={false}
              cursor={{ fill: "rgba(59,130,246,0.06)" }}
              contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)", background: "rgba(255,255,255,0.95)" }}
            />
            <Legend wrapperStyle={{ paddingTop: 12 }} />
            <Bar dataKey="female" name="Female" fill="url(#soloFemale)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="male" name="Male" fill="url(#soloMale)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
