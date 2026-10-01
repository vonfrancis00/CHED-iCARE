import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, CheckCircle2, ClipboardList, RefreshCw, Sparkles, Users } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import FacilityStatusChart from "../components/dashboard/FacilityStatusChart";
import ProgramStatusChart from "../components/dashboard/ProgramStatusChart";

const count = value => Math.max(0, Number(value) || 0);
const format = value => count(value).toLocaleString();
const totalAnswers = item => count(item?.yes) + count(item?.no) + count(item?.planned);
const rate = item => totalAnswers(item) ? Math.round(count(item.yes) / totalAnswers(item) * 100) : null;
const totals = items => items.reduce((sum, item) => ({ yes: sum.yes + count(item.yes), no: sum.no + count(item.no), planned: sum.planned + count(item.planned) }), { yes: 0, no: 0, planned: 0 });
const displayRate = value => value === null ? "?" : `${value}%`;

function ReadinessBar({ label, item, tone }) {
  const value = rate(item);
  return <div>
    <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-slate-500">{label}</span><strong className="text-slate-800">{displayRate(value)}</strong></div>
    <div role="img" aria-label={`${label}: ${value === null ? "no recorded answers" : `${value}% affirmative answers`}`} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value ?? 0}%` }} /></div>
    <p className="mt-2 text-xs text-slate-500">{value === null ? "No recorded answers" : `${format(item.yes)} yes / ${format(totalAnswers(item))} answers`}</p>
  </div>;
}

export default function Childcare() {
  const { data, loading, refreshing, error, reload } = useDashboard();
  const [selectedGroup, setSelectedGroup] = useState("all");

  if (loading && !data) return <Loading label="Loading facility and program insights..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold text-slate-900">Unable to load childcare analysis</h2><p className="mt-2 text-sm text-slate-500">{error || "No childcare data is available."}</p><button type="button" onClick={() => reload({ force: true })} className="mt-4 rounded-xl bg-[#08264d] px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  const allFacilities = Array.isArray(data.facilityQuestions) ? data.facilityQuestions : [];
  const allPrograms = Array.isArray(data.programQuestions) ? data.programQuestions : [];
  const groups = [...new Set([...allFacilities, ...allPrograms].map(item => item.name).filter(Boolean))];
  const group = groups.includes(selectedGroup) ? selectedGroup : "all";
  const facility = allFacilities.filter(item => group === "all" || item.name === group);
  const program = allPrograms.filter(item => group === "all" || item.name === group);
  const facilityTotals = totals(facility), programTotals = totals(program);
  const facilityRate = rate(facilityTotals), programRate = rate(programTotals);
  const hasAnswers = totalAnswers(facilityTotals) + totalAnswers(programTotals) > 0;
  const visibleGroups = group === "all" ? groups : [group];
  const stats = [
    { label: "Facilities reported available", value: format(facilityTotals.yes), hint: `${format(facilityTotals.planned)} planned / ongoing answers`, Icon: Building2, tone: "bg-blue-50 text-blue-700" },
    { label: "Facility availability", value: displayRate(facilityRate), hint: "Share of facility answers marked yes", Icon: CheckCircle2, tone: "bg-teal-50 text-teal-700" },
    { label: "Programs reported documented", value: format(programTotals.yes), hint: `${format(programTotals.planned)} planned / ongoing answers`, Icon: ClipboardList, tone: "bg-violet-50 text-violet-700" },
    { label: "Program availability", value: displayRate(programRate), hint: "Share of program answers marked yes", Icon: Sparkles, tone: "bg-sky-50 text-sky-700" }
  ];

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200"><Building2 size={15} />Childcare readiness</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl uppercase">Childcare Facilities & Programs</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Explore available facilities, documented programs, and planned support for each user group.</p></div>
        <button type="button" onClick={() => reload({ force: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing..." : "Refresh data"}</button>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-blue-200"><span>{format(data.overview?.totalResponses)} survey submissions</span><span>{groups.length} user groups</span>{data.source === "demo" && <span className="rounded-full bg-amber-200/15 px-2 py-1 text-amber-100">Demo data</span>}</div>
    </header>
    {error && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing the most recently available data. {error}</div>}

    <section aria-labelledby="childcare-scope-title" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div><h2 id="childcare-scope-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Users size={17} className="text-blue-700" />Focus your analysis</h2><p className="mt-1 text-xs leading-5 text-slate-500">The summary, charts, and comparison reflect your selected user group.</p></div>
      <div className="w-full sm:w-64"><label htmlFor="childcare-group" className="sr-only">User group</label><select id="childcare-group" value={group} onChange={event => setSelectedGroup(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="all">All user groups</option>{groups.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
    </section>

    <section aria-label="Childcare summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, hint, Icon, tone }) => <div key={label} className="card p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium leading-5 text-slate-500">{label}</p><span className={`shrink-0 rounded-xl p-2.5 ${tone}`}><Icon size={20} /></span></div><p className="mt-3 text-3xl font-bold tracking-tight text-[#08264d]">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p></div>)}</section>
    <p className="px-1 text-xs leading-5 text-slate-500">Counts represent survey answers across the selected groups. A submission can contribute to more than one group. Percentages use each question?s recorded yes, no, and planned / ongoing answers.</p>

    {!hasAnswers ? <section className="card px-6 py-12 text-center"><Building2 size={32} className="mx-auto text-slate-400" /><h2 className="mt-4 font-semibold text-slate-900">No childcare responses available</h2><p className="mt-2 text-sm text-slate-500">{group === "all" ? "Facility and program findings will appear when survey answers are recorded." : "Choose another user group to explore its responses."}</p>{group !== "all" && <button type="button" onClick={() => setSelectedGroup("all")} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-700">Show all groups</button>}</section> : <>
      <section aria-labelledby="childcare-comparison-title" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="childcare-comparison-title" className="text-lg font-semibold text-slate-900">Readiness by user group</h2><p className="mt-1 text-xs leading-5 text-slate-500">Compare affirmative facility and program answers within each group.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{group === "all" ? "All user groups" : group}</span></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">{visibleGroups.map(name => <article key={name} className="rounded-2xl border border-slate-200 p-4"><h3 className="mb-5 text-sm font-semibold text-slate-900 uppercase">{name}</h3><div className="space-y-5"><ReadinessBar label="Facilities available" item={facility.find(item => item.name === name)} tone="bg-blue-600" /><ReadinessBar label="Programs documented" item={program.find(item => item.name === name)} tone="bg-violet-600" /></div></article>)}</div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">{totalAnswers(facilityTotals) > 0 ? <FacilityStatusChart data={facility} /> : <section className="card p-6"><h2 className="font-semibold text-slate-900">Childcare Facility Responses</h2><p className="mt-8 text-sm text-slate-500">No facility answers recorded for this selection.</p></section>}{totalAnswers(programTotals) > 0 ? <ProgramStatusChart data={program} /> : <section className="card p-6"><h2 className="font-semibold text-slate-900">Documented Childcare Program Responses</h2><p className="mt-8 text-sm text-slate-500">No program answers recorded for this selection.</p></section>}</div>
    </>}
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div><h2 className="text-sm font-semibold text-[#08264d]">Share the childcare findings</h2><p className="mt-1 text-xs leading-5 text-slate-500">Open Reports to prepare a facility and program PDF from the survey data.</p></div><Link to="/reports" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Open reports<ArrowUpRight size={16} /></Link></section>
  </div>;
}
