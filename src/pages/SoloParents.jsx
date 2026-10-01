import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, HeartHandshake, RefreshCw, Users, GraduationCap, MapPin } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import SoloParentChart from "../components/dashboard/SoloParentChart";

const count = value => Math.max(0, Number(value) || 0);
const format = value => count(value).toLocaleString();
const hasValue = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const displayCount = value => hasValue(value) ? format(value) : "?";

function PopulationCard({ item, title, description, Icon }) {
  const female = count(item.female), male = count(item.male), sexTotal = female + male;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Icon size={22} /></span><div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>
    <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4">{[["Reported total", item.total], ["Female", item.female], ["Male", item.male]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-words text-xl font-bold tabular-nums text-[#08264d] sm:text-2xl">{displayCount(value)}</dd></div>)}</dl>
    <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">Composition by reported sex</h3>
    {sexTotal > 0 ? <>
      <div role="img" aria-label={`${title}: ${(female / sexTotal * 100).toFixed(1)}% female and ${(male / sexTotal * 100).toFixed(1)}% male`} className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100"><div className="bg-red-500" style={{ width: `${female / sexTotal * 100}%` }} /><div className="bg-blue-600" style={{ width: `${male / sexTotal * 100}%` }} /></div>
      <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs"><span className="text-slate-600"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />Female <strong className="ml-1 text-slate-800">{(female / sexTotal * 100).toFixed(1)}%</strong></span><span className="text-slate-600"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" />Male <strong className="ml-1 text-slate-800">{(male / sexTotal * 100).toFixed(1)}%</strong></span></div>
    </> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">No positive sex-specific counts are available for this group.</p>}
    {hasValue(item.total) && hasValue(item.female) && hasValue(item.male) && count(item.total) !== sexTotal && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">The reported total differs from the sum of female and male counts. Composition uses the sex-specific counts.</p>}
  </section>;
}

export default function SoloParents() {
  const { data, loading, refreshing, error, reload } = useDashboard();
  const [scope, setScope] = useState("all");
  if (loading && !data) return <Loading label="Loading solo parent insights..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold text-slate-900">Unable to load solo parent data</h2><p className="mt-2 text-sm text-slate-500">{error || "No solo parent data is available."}</p><button type="button" onClick={() => reload({ force: true })} className="mt-4 rounded-xl bg-[#08264d] px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;
  const rows = Array.isArray(data.soloParents) ? data.soloParents : [];
  const campus = rows.find(item => item.name === "Enrolled") || {};
  const community = rows.find(item => item.name === "Community") || {};
  const populations = [
    { name: "Enrolled", item: campus, title: "Enrolled Solo Parents", description: "Solo parents enrolled at participating institutions.", Icon: GraduationCap },
    { name: "Community", item: community, title: "Community Solo Parents", description: "Solo parents reported in surrounding communities.", Icon: MapPin }
  ];
  const visible = populations.filter(item => scope === "all" || item.name === scope);
  const chartData = visible.map(({ name, item }) => ({ ...item, name, female: count(item.female), male: count(item.male) }));
  const hasSexCounts = chartData.some(item => item.female + item.male > 0);
  const selectedItem = scope === "Enrolled" ? campus : community;
  const summary = scope === "all"
    ? [["Enrolled Solo Parents", campus.total, "Reported enrolled population", GraduationCap], ["Community Solo Parents", community.total, "Reported surrounding population", MapPin], ["Survey Submissions", data.overview?.totalResponses, "Submissions in the survey dataset", Users]]
    : [["Reported Solo Parents", selectedItem.total, `${scope} population`, Users], ["Female solo parents", selectedItem.female, `${scope} population`, HeartHandshake], ["Male solo parents", selectedItem.male, `${scope} population`, Users]];

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200"><HeartHandshake size={15} />Family support</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl uppercase">Solo Parents</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Explore reported solo parent enrollment and community populations to inform childcare support.</p></div><button type="button" onClick={() => reload({ force: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing..." : "Refresh data"}</button></div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-blue-200"><span>Enrolled & community populations</span><span>Female & male counts</span>{data.source === "demo" && <span className="rounded-full bg-amber-200/15 px-2 py-1 text-amber-100">Demo data</span>}</div>
    </header>
    {error && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing the most recently available data. {error}</div>}
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="solo-scope-title"><div><h2 id="solo-scope-title" className="text-sm font-semibold text-slate-900">Focus your analysis</h2><p className="mt-1 text-xs leading-5 text-slate-500">Compare both populations or explore a single group.</p></div><div className="w-full sm:w-64"><label htmlFor="solo-scope" className="sr-only">Population group</label><select id="solo-scope" value={scope} onChange={event => setScope(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="all">Both populations</option><option value="Enrolled">Enrolled Solo Parents</option><option value="Community">Community solo parents</option></select></div></section>
    <section aria-label="Solo parent summary" className="grid gap-4 sm:grid-cols-3">{summary.map(([label, value, hint, Icon]) => <div key={label} className="card p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-500">{label}</p><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Icon size={20} /></span></div><p className="mt-3 text-3xl font-bold tabular-nums text-[#08264d]">{displayCount(value)}</p><p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p></div>)}</section>
    <div className={`grid gap-6 ${visible.length > 1 ? "xl:grid-cols-2" : ""}`}>{visible.map(population => <PopulationCard key={population.name} {...population} />)}</div>
    {hasSexCounts ? <SoloParentChart data={chartData} /> : <section className="card px-6 py-10 text-center"><Users size={30} className="mx-auto text-slate-400" /><h2 className="mt-4 font-semibold text-slate-900">No sex-specific counts to chart</h2><p className="mt-2 text-sm text-slate-500">The comparison chart will appear when positive female or male counts are recorded for this selection.</p></section>}
    <p className="px-1 text-xs leading-5 text-slate-500">Figures reflect reported survey counts. Female and male shares use the sum of sex-specific counts within each group. A dash indicates an unavailable count; enrolled and community populations are shown separately.</p>
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div><h2 className="text-sm font-semibold text-[#08264d]">Share the solo parent findings</h2><p className="mt-1 text-xs leading-5 text-slate-500">Open Reports to prepare a solo parent PDF from the survey data.</p></div><Link to="/reports" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Open reports<ArrowUpRight size={16} /></Link></section>
  </div>;
}
