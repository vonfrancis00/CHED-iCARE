
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import ChartCard from "./ChartCard";

export default function FacilityStatusChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <ChartCard title="Childcare Facility Responses" subtitle="Institutional survey responses on the availability of campus childcare facilities for faculty, non-teaching personnel, students, and community members." className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-50/80">
      <div className="chart-scroll" tabIndex={0} role="region" aria-label="Scrollable chart"><div className="h-[360px]" style={{ minWidth: Math.max(440, safeData.length * 65) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 12, right: 12, left: 4, bottom: 24 }}>
            <defs>
              <linearGradient id="facilityYes" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="facilityNo" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="facilityPlanned" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#475569" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              shared={false}
              cursor={{ fill: "rgba(16, 185, 129, 0.06)" }}
              contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 14px 40px rgba(15, 23, 42, 0.08)", background: "rgba(255,255,255,0.95)" }}
            />
            <Legend wrapperStyle={{ paddingTop: 12 }} />
            <Bar dataKey="yes" name="Yes" fill="url(#facilityYes)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="no" name="No" fill="url(#facilityNo)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="planned" name="Plans / Work" fill="url(#facilityPlanned)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div></div>
    </ChartCard>
  );
}
