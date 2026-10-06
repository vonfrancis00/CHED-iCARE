import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, MapPinned, ArrowRight, Trophy, ClipboardList, X } from "lucide-react";
import { useInstitutionGroups } from "../../hooks/useInstitutionGroups";
import { summarizeParticipation } from "../../utils/regionalParticipation";

function RankingRow({ item, showInstitutions, category, showRank = true }) {
  return <div className="flex w-full items-center gap-3 rounded-xl p-3">
    {showRank ? <span aria-label={`Rank ${item.rank}`} className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-blue-700">#{item.rank}</span> : <span aria-hidden="true" className="w-8 shrink-0" />}
    {showInstitutions ? <Building2 size={17} className="shrink-0 text-blue-600" /> : <MapPinned size={17} className="shrink-0 text-blue-600" />}
    <div className="min-w-0 flex-1">
      {showInstitutions && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{item.type}</span>}
      <p className="text-sm font-medium text-slate-700">{item.name}</p>
    </div>
    <span className="shrink-0 text-xs text-slate-500">{item.count} existing {category}</span>
  </div>;
}

export default function RegionalParticipation({ institutionType, region }) {
  const { data, loading, backgroundLoading, hasCompleteData, error, reload } = useInstitutionGroups("", "", "");
  const [exploring, setExploring] = useState(null);
  const [regionSearch, setRegionSearch] = useState("");
  const [showInstitutions, setShowInstitutions] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!exploring) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [exploring]);
  const summary = useMemo(() => summarizeParticipation(data?.data || [], institutionType, region), [data, institutionType, region]);
  const rankedRegions = useMemo(() => {
    const sorted = [...(summary[exploring]?.[showInstitutions ? "rankings" : "regions"] || [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { numeric: true }) || (a.type || "").localeCompare(b.type || ""));
    let rank = 0;
    return sorted.map((item, index) => {
      if (index === 0 || item.count !== sorted[index - 1].count) rank += 1;
      return { ...item, rank };
    });
  }, [summary, exploring, showInstitutions]);
  const visibleRegions = rankedRegions.filter(item => item.name.toLowerCase().includes(regionSearch.trim().toLowerCase()));
  const rankGroups = [];
  for (const item of visibleRegions) {
    const previous = rankGroups[rankGroups.length - 1];
    if (showInstitutions && previous?.[0].rank === item.rank) previous.push(item);
    else rankGroups.push([item]);
  }
  const pending = !hasCompleteData && (loading || backgroundLoading);
  const categories = [
    { key: "facilities", label: "Facilities", Icon: Building2 },
    { key: "programs", label: "Programs", Icon: ClipboardList },
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
            </div>
            <button type="button" disabled={!summary[key].regions.length} aria-haspopup="dialog" onClick={() => { setShowInstitutions(false); setRegionSearch(""); setExploring(key); }} className="flex items-center justify-between border-t border-blue-100 bg-blue-50/60 px-6 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">Explore regions<ArrowRight size={17} /></button>
          </article>)}
          {categories.map(({ key, label }) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Trophy size={23} className="mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">SUC / LUC with the most reported {label}</h3>
            <p className="mt-1 text-xs text-slate-500">Ranked by reported existing {label} across faculty, student and community questions.</p>
            {summary[key].leaders.length ? <div className="mt-5 space-y-3">
              {summary[key].leaders.length > 1 && <p className="text-xs font-semibold text-blue-600">{summary[key].leaders.length} institutions tied for highest</p>}
              {summary[key].leaders.map(item => <div key={`${item.type}:${item.name}`} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{item.type}</span><p className="mt-1 text-sm font-semibold text-slate-900">{item.name}</p></div><div className="shrink-0 text-right"><p className="text-2xl font-bold text-blue-700">{item.count.toLocaleString()}</p><p className="text-[10px] text-slate-500">Existing {label}</p></div></div>)}
            </div> : <p className="mt-5 text-sm text-slate-500">No SUC or LUC reported existing {label} for this selection.</p>}
            <button type="button" disabled={!summary[key].rankings.length} aria-haspopup="dialog" onClick={() => { setShowInstitutions(true); setRegionSearch(""); setExploring(key); }} className="mt-5 flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">View rankings<ArrowRight size={17} /></button>
          </article>)}
        </div>
        <p className="text-xs leading-5 text-slate-500">Counts use Yes answers in survey submissions, not distinct physical facilities or programs. A submission can report availability for multiple user groups. Regions are counted once; repeated submissions contribute to institution rankings.</p>
      </>}
    {exploring && createPortal(
      <dialog ref={dialogRef} aria-labelledby="explore-regions-title" aria-describedby="explore-regions-description" onCancel={() => setExploring(null)} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setExploring(null);
      }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-blue-100 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50">
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-blue-100 p-5 sm:p-6">
            <div>
              <h2 id="explore-regions-title" className="text-lg font-bold text-slate-900">{showInstitutions ? `SUC / LUC rankings for ${exploring}` : `Regions with existing ${exploring}`}</h2>
              <p id="explore-regions-description" className="mt-2 text-sm text-slate-500">{rankedRegions.length} {showInstitutions ? "institutions" : "regions"} with at least one Yes answer for {exploring}. Ranked from highest to lowest; equal counts share a rank.</p>
            </div>
            <button type="button" autoFocus aria-label="Close rankings" onClick={() => setExploring(null)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-blue-600"><X size={20} /></button>
          </header>
          <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
            <label htmlFor="participation-region-search" className="mb-2 block text-sm font-medium text-slate-700">Filter by {showInstitutions ? "institution" : "region"}</label>
            <input id="participation-region-search" type="search" value={regionSearch} onChange={event => setRegionSearch(event.target.value)} placeholder={showInstitutions ? "Search institution name..." : "Search region name..."} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            <p role="status" className="mt-2 text-xs text-slate-500">{visibleRegions.length} of {rankedRegions.length} {showInstitutions ? "institutions" : "regions"} match the filter</p>
          </div>
          <div className="min-h-0 overflow-y-auto p-3 sm:p-4">
            <ul>
              {rankGroups.map(items => <li key={`${items[0].rank}:${items[0].name}:${regionSearch}`}>
                <RankingRow item={items[0]} showInstitutions={showInstitutions} category={exploring} />
                {items.length > 1 && <details className="group mb-3">
                  <summary className="ml-14 w-fit cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-blue-600">
                    <span className="group-open:hidden">See more ({items.length - 1} more tied at #{items[0].rank})</span>
                    <span className="hidden group-open:inline">See less</span>
                  </summary>
                  <ul className="rounded-xl bg-slate-50">
                    {items.slice(1).map(item => <li key={`${item.type}:${item.name}`}><RankingRow item={item} showInstitutions={showInstitutions} category={exploring} showRank={false} /></li>)}
                  </ul>
                </details>}
              </li>)}
            </ul>
            {!visibleRegions.length && <p className="p-6 text-center text-sm text-slate-500">No {showInstitutions ? "institutions" : "regions"} match your search.</p>}
          </div>
        </div>
      </dialog>, document.body
    )}
  </section>;
}
