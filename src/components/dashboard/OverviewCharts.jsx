import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import ChartCard from "./ChartCard";

const colors = ["#2563eb", "#0d9488", "#7c3aed", "#d97706", "#0891b2", "#cbd5e1"];
const count = value => Math.max(0, Number(value) || 0);
const percent = (value, total) => total ? 100 * value / total : 0;
const format = value => value.toLocaleString();
const rows = value => Array.isArray(value) ? value : [];
const Empty = () => <p className="py-12 text-center text-sm text-slate-500">No data available for this selection.</p>;

function DetailLink({ to, children }) {
  return <Link to={to} className="mt-5 inline-block text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-blue-600">{children} &rarr;</Link>;
}

function Ring({ data, label, value }) {
  return <div className="relative mx-auto h-48 w-full max-w-[240px]">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="90%" paddingAngle={2} stroke="none" isAnimationActive={false}>
        {data.map((item, index) => <Cell key={item.name} fill={item.color || colors[index % colors.length]} />)}
      </Pie><Tooltip formatter={value => format(Number(value))} contentStyle={{ borderRadius: 12 }} /></PieChart>
    </ResponsiveContainer>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl tabular-nums text-slate-900">{value}</strong><span className="mt-1 text-xs text-slate-500">{label}</span></div>
  </div>;
}

export default function OverviewCharts({ data, offices }) {
  const facilities = rows(data.facilityQuestions);
  const programs = rows(data.programQuestions);
  const locations = rows(data.regions).map(item => ({ name: item.name, value: count(item.value) })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const locationTotal = locations.reduce((sum, item) => sum + item.value, 0);
  const locationSlices = locations.slice(0, 5);
  if (locations.length > 5) locationSlices.push({ name: "All remaining locations", value: locations.slice(5).reduce((sum, item) => sum + item.value, 0) });
  const parents = rows(data.soloParents);
  const pending = rows(offices).map(item => ({ name: item.name, value: Math.max(0, count(item.value) - count(item.responded)) })).sort((a, b) => b.value - a.value);
  const pendingTotal = pending.reduce((sum, item) => sum + item.value, 0);
  const maxPending = Math.max(1, ...pending.map(item => item.value));

  return <div className="mt-6 grid gap-6 xl:grid-cols-2">
    <ChartCard title="Where facilities are available" subtitle="Yes responses as a share of all survey submissions, by user group.">
      {facilities.length && count(data.overview?.totalResponses) ? <div className="space-y-6 py-2">{facilities.map(item => {
        const total = count(data.overview?.totalResponses);
        const rate = percent(count(item.yes), total);
        return <div key={item.name}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">{item.name}</span><strong className="text-blue-700">{rate.toFixed(1)}%</strong></div>
          <div role="img" aria-label={`${item.name}: ${rate.toFixed(1)}% yes`} className="relative h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-blue-600" style={{ width: `${Math.min(100, rate)}%` }} /><span className="absolute top-[-3px] h-[18px] w-px bg-slate-300" style={{ left: "50%" }} /></div>
          <p className="mt-2 text-xs text-slate-500">{format(count(item.yes))} yes / {format(total)} submissions</p></div>;
      })}<p className="text-xs text-slate-400">Center marker: 50% of submissions.</p></div> : <Empty />}
      <DetailLink to="/childcare">Explore childcare responses</DetailLink>
    </ChartCard>

    <ChartCard title="Program readiness at a glance" subtitle="Response mix by user group. Darker cells indicate a larger share of classified answers.">
      {programs.length ? <div className="min-w-0"><table className="w-full table-fixed border-separate border-spacing-1 text-xs sm:border-spacing-2"><thead><tr><th scope="col" className="w-[34%] text-left font-medium text-slate-500">User group</th>{["Yes", "No", "Planned"].map(label => <th scope="col" key={label} className="break-words font-medium text-slate-500">{label}</th>)}</tr></thead><tbody>{programs.map(item => {
        const total = count(item.yes) + count(item.no) + count(item.planned);
        return <tr key={item.name}><th scope="row" className="break-words py-4 pr-1 text-left font-medium text-slate-700">{item.name}</th>{["yes", "no", "planned"].map(key => {
          const rate = percent(count(item[key]), total);
          return <td key={key} className="break-words rounded-xl px-1 py-3 text-center sm:px-2" style={{ backgroundColor: `rgba(37, 99, 235, ${0.05 + rate / 125})`, color: rate > 60 ? "white" : "#1e3a8a" }}><strong className="block text-sm">{total ? `${rate.toFixed(0)}%` : "—"}</strong><span className="mt-1 block text-[10px]">{format(count(item[key]))} answers</span></td>;
        })}</tr>;
      })}</tbody></table><p className="mt-3 text-xs text-slate-500">Excludes blank and unclassified answers. Planned includes ongoing programs.</p></div> : <Empty />}
      <DetailLink to="/childcare">View detailed program counts</DetailLink>
    </ChartCard>

    <ChartCard title={data.locationDistributionGroup === "institution" ? "Institution response share" : "Regional response share"} subtitle="How recorded submissions are distributed across the five largest contributors and remaining locations." className="xl:col-span-2">
      {locationTotal ? <div className="grid items-center gap-6 sm:grid-cols-[240px_1fr]"><Ring data={locationSlices} label="submissions" value={format(locationTotal)} /><ul className="grid gap-4 md:grid-cols-2">{locationSlices.map((item, index) => <li key={item.name} className="flex items-start gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{item.name}</p><p className="mt-1 text-xs text-slate-500">{format(item.value)} submissions · {percent(item.value, locationTotal).toFixed(1)}%</p></div></li>)}</ul></div> : <Empty />}
      <DetailLink to="/geographic">Explore geographic distribution</DetailLink>
    </ChartCard>

    <ChartCard title="Solo-parent composition" subtitle="Female and male shares within each reported group, based on the sum of sex-specific counts.">
      {parents.some(item => count(item.female) + count(item.male) > 0) ? <div className="grid gap-4 sm:grid-cols-2">{parents.map(item => {
        const total = count(item.female) + count(item.male);
        return <div key={item.name} className="min-w-0 rounded-2xl bg-slate-50 p-3"><h3 className="text-center text-sm font-semibold text-slate-700">{item.name}</h3>{total ? <Ring data={[{ name: "Female", value: count(item.female), color: colors[2] }, { name: "Male", value: count(item.male), color: colors[4] }]} label="reported by sex" value={format(total)} /> : <p className="py-12 text-center text-xs text-slate-500">No sex-specific counts</p>}<div className="space-y-2 text-xs">{[["Female", "female", colors[2]], ["Male", "male", colors[4]]].map(([label, key, color]) => <div key={key} className="flex flex-wrap items-center justify-between gap-1"><span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="font-medium">{format(count(item[key]))} · {total ? `${percent(count(item[key]), total).toFixed(1)}%` : "—"}</span></div>)}</div></div>;
      })}</div> : <Empty />}
      <DetailLink to="/solo-parents">Explore solo-parent statistics</DetailLink>
    </ChartCard>

    <ChartCard title="Office follow-up workload" subtitle="Outstanding institution submissions by office. Office assignments are independent of the dashboard filters.">
      {pending.length ? <><div className="mb-5 flex items-baseline gap-2"><strong className="text-3xl tabular-nums text-slate-900">{format(pendingTotal)}</strong><span className="text-xs text-slate-500">pending across all offices</span></div><div className="space-y-4">{pending.map(item => <div key={item.name}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="text-slate-600">{item.name}</span><strong className="tabular-nums text-amber-700">{format(item.value)}</strong></div><div role="img" aria-label={`${item.name}: ${item.value} pending submissions`} className="h-2 rounded-full bg-amber-50"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${percent(item.value, maxPending)}%` }} /></div></div>)}</div>{pendingTotal === 0 && <p className="mt-4 text-sm text-teal-700">No outstanding submissions in the office register.</p>}</> : <Empty />}
      <DetailLink to="/occ">Open office monitoring</DetailLink>
    </ChartCard>
  </div>;
}
