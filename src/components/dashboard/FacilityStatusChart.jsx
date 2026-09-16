
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import ChartCard from "./ChartCard";

export default function FacilityStatusChart({ data = [] }) {
  return (
    <ChartCard title="Childcare Facility Responses" subtitle="Counts directly from the three facility questions in Form Responses 1">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{bottom: 20}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 11}} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="yes" name="Yes" fill="#0f766e" radius={[5,5,0,0]} />
            <Bar dataKey="no" name="No" fill="#94a3b8" radius={[5,5,0,0]} />
            <Bar dataKey="planned" name="Plans / Work" fill="#f59e0b" radius={[5,5,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
