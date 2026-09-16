import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import ChartCard from "./ChartCard";

export default function SoloParentChart({ data }) {
  return (
    <ChartCard title="Solo Parent Statistics" subtitle="Reported female and male counts">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="female" name="Female" fill="#7c3aed" radius={[6,6,0,0]} />
            <Bar dataKey="male" name="Male" fill="#0f766e" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
