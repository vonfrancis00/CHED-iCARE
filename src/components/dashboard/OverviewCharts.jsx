import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "./ChartCard";

const colors = ["#2563eb", "#0d9488", "#7c3aed", "#d97706", "#0891b2", "#cbd5e1"];
const soloParentColors = { female: "#dc2626", male: "#1d4ed8" };
const count = value => Math.max(0, Number(value) || 0);
const percent = (value, total) => total ? 100 * value / total : 0;
const format = value => value.toLocaleString();
const rows = value => Array.isArray(value) ? value : [];
const Empty = () => <p className="py-12 text-center text-sm text-slate-500">No data available for this selection.</p>;

function Ring({ data, label, value }) {
  return <div className="relative mx-auto h-48 w-full max-w-[240px]">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="90%" paddingAngle={2} stroke="none" isAnimationActive={false}>
        {data.map((item, index) => <Cell key={item.name} fill={item.color || colors[index % colors.length]} />)}
      </Pie><Tooltip formatter={value => format(Number(value))} wrapperStyle={{ zIndex: 10, pointerEvents: "none" }} contentStyle={{ borderRadius: 12, backgroundColor: "#fff" }} /></PieChart>
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl tabular-nums text-slate-900">{value}</strong><span className="mt-1 text-xs text-slate-500">{label}</span></div>
  </div>;
}

export default function OverviewCharts({ data }) {
  const locations = rows(data.regions).map(item => ({ name: item.name, value: count(item.value) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const locationTotal = locations.reduce((sum, item) => sum + item.value, 0);
  const locationSlices = locations.slice(0, 5);
  if (locations.length > 5) locationSlices.push({ name: "All remaining locations", value: locations.slice(5).reduce((sum, item) => sum + item.value, 0) });
  const parents = rows(data.soloParents);
  return <div className="mt-6 grid gap-6 xl:grid-cols-2">
    <ChartCard title={data.locationDistributionGroup === "institution" ? "Institution response share" : "Regional Response Share"} subtitle="How recorded submissions are distributed across the five largest contributors and remaining locations." className="xl:col-span-2">
      {locationTotal ? <div className="grid items-center gap-6 sm:grid-cols-[240px_1fr]"><Ring data={locationSlices} label="SUBMISSIONS" value={format(locationTotal)} /><ul className="grid gap-4 md:grid-cols-2">{locationSlices.map((item, index) => <li key={item.name} className="flex items-start gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{item.name}</p><p className="mt-1 text-xs text-slate-500">{format(item.value)} submissions · {percent(item.value, locationTotal).toFixed(1)}%</p></div></li>)}</ul></div> : <Empty />}
    </ChartCard>

    <ChartCard title="Solo-parent Composition" subtitle="Female and male shares within each reported group, based on the sum of sex-specific counts." className="xl:col-span-2">
      {parents.some(item => count(item.female) + count(item.male) > 0) ? <div className={`grid gap-4 sm:grid-cols-2 ${parents.length > 2 ? "xl:grid-cols-3" : ""}`}>{parents.map(item => {
        const total = count(item.female) + count(item.male);
        return <div key={item.name} className="min-w-0 rounded-2xl bg-slate-50 p-3"><h3 className="text-center text-sm font-semibold text-slate-700">{item.name}</h3>{total ? <Ring data={[{ name: "Female", value: count(item.female), color: soloParentColors.female }, { name: "Male", value: count(item.male), color: soloParentColors.male }]} label="reported by sex" value={format(total)} /> : <p className="py-12 text-center text-xs text-slate-500">No sex-specific counts</p>}<div className="space-y-2 text-xs">{[["Female", "female", soloParentColors.female], ["Male", "male", soloParentColors.male]].map(([label, key, color]) => <div key={key} className="flex flex-wrap items-center justify-between gap-1"><span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="font-medium">{format(count(item[key]))} · {total ? `${percent(count(item[key]), total).toFixed(1)}%` : "—"}</span></div>)}</div></div>;
      })}</div> : <Empty />}
    </ChartCard>


  </div>;
}
