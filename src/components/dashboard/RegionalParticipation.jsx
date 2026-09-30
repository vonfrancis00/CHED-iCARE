import { useMemo, useState } from "react";
import { Building2, MapPinned, ArrowRight, Trophy, ClipboardList } from "lucide-react";
import { useInstitutionGroups } from "../../hooks/useInstitutionGroups";
import { summarizeParticipation } from "../../utils/regionalParticipation";

export default function RegionalParticipation({ institutionType, region, onSelectRegion }) {
  const { data, loading, backgroundLoading, error, reload } = useInstitutionGroups("", "", "");
  const [exploring, setExploring] = useState(null);
  const summary = useMemo(() => summarizeParticipation(data?.data || [], institutionType, region), [data, institutionType, region]);
  const pending = loading || backgroundLoading;
  const categories = [
    { key: "facilities", label: "facilities", Icon: Building2 },
    { key: "programs", label: "programs", Icon: ClipboardList },
  ];

  return <section aria-labelledby="regional-participation-title" className="space-y-5">
    <div>
      <h2 id="regional-participation-title" className="text-xl font-bold text-slate-900">Regional Participation</h2>
      <p className="mt-1 text-sm text-slate-500">Existing childcare facilities and programs across {region || "all regions"} · {institutionType || "SUCs and LUCs"}</p>
    </div>
    {error ? <div role="alert" className="card p-5 text-sm text-red-700">Unable to load participation details. {error}<button type="button" onClick={reload} className="ml-3 font-semibold underline">Retry</button></div>
      : pending ? <div role="status" className="card p-8 text-sm text-slate-500">Loading all responses for regional participation...</div>
      : <>
        <div className="grid gap-5 md:grid-cols-2">
          {categories.map(({ key, label, Icon }) => <article key={key} className="flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="flex-1 p-6">
              <div className="mb-5 flex items-center justify-between"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={24} /></span><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Regional coverage</span></div>
              <p className="text-4xl font-bold tabular-nums text-blue-700">{summary[key].regions.length}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Regions with existing {label}</h3>
              <p className="mt-2 text-sm text-slate-500">Regions with at least one Yes answer for {label}.</p>
            </div>
            <button type="button" disabled={!summary[key].regions.length} aria-expanded={exploring === key} aria-controls={`explore-${key}`} onClick={() => setExploring(exploring === key ? null : key)} className="flex items-center justify-between border-t border-blue-100 bg-blue-50/60 px-6 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">{exploring === key ? "Close regions" : "Explore regions"}<ArrowRight size={17} /></button>
            <div id={`explore-${key}`} hidden={exploring !== key} className="max-h-72 overflow-y-auto border-t border-blue-100 p-4">
              {summary[key].regions.map(item => <button type="button" key={item.name} onClick={() => { onSelectRegion(item.name); setExploring(null); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-blue-50 focus-visible:outline-blue-600"><MapPinned size={17} className="shrink-0 text-blue-600" /><span className="flex-1 text-sm font-medium text-slate-700">{item.name}</span><span className="text-xs text-slate-500">{item.count} Yes answers</span><ArrowRight size={15} /></button>)}
            </div>
          </article>)}
          {categories.map(({ key, label }) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Trophy size={23} className="mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">SUC / LUC with the most reported {label}</h3>
            <p className="mt-1 text-xs text-slate-500">Ranked by Yes answers across faculty, student and community questions.</p>
            {summary[key].leaders.length ? <div className="mt-5 space-y-3">
              {summary[key].leaders.length > 1 && <p className="text-xs font-semibold text-blue-600">{summary[key].leaders.length} institutions tied for highest</p>}
              {summary[key].leaders.map(item => <div key={`${item.type}:${item.name}`} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{item.type}</span><p className="mt-1 text-sm font-semibold text-slate-900">{item.name}</p></div><div className="shrink-0 text-right"><p className="text-2xl font-bold text-blue-700">{item.count.toLocaleString()}</p><p className="text-[10px] text-slate-500">Yes answers</p></div></div>)}
            </div> : <p className="mt-5 text-sm text-slate-500">No SUC or LUC reported existing {label} for this selection.</p>}
          </article>)}
        </div>
        <p className="text-xs leading-5 text-slate-500">Counts use Yes answers in survey submissions, not distinct physical facilities or programs. A submission can report availability for multiple user groups. Regions are counted once; repeated submissions contribute to institution rankings.</p>
      </>}
  </section>;
}
