
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MapPinned, Building2, TrendingUp, Compass } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import RegionalChart from "../components/dashboard/RegionalChart";
import RegionalParticipation from "../components/dashboard/RegionalParticipation";

function sortRegions(regions) {
  return [...regions].sort((left, right) => {
    const leftNumber = /^Region\s+(\d+)$/i.exec(String(left || "").trim());
    const rightNumber = /^Region\s+(\d+)$/i.exec(String(right || "").trim());
    if (leftNumber && rightNumber) return Number(leftNumber[1]) - Number(rightNumber[1]);
    if (leftNumber) return -1;
    if (rightNumber) return 1;
    return String(left || "").localeCompare(String(right || ""));
  });
}

export default function Geographic() {
  const [institutionType, setInstitutionType] = useState("");
  const [region, setRegion] = useState("");
  const { data: snapshot, loading, error } = useDashboard();
  const filterView = snapshot?.filterViews?.[JSON.stringify([institutionType, region.toLowerCase()])];
  const data = filterView ? { ...snapshot, ...filterView } : snapshot;

  if (loading) return <Loading label="Loading geographic insights..." />;
  if (error) {
    return (
      <div className="card p-8">
        <h2 className="font-semibold text-slate-900">Unable to load geographic analysis</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  const regions = data?.regions ?? [];
  const chartRegions = snapshot?.filterViews ? regions.map((item) => {
    const countForType = (type) => {
      if (institutionType && institutionType !== type) return 0;
      const view = snapshot.filterViews[JSON.stringify([type, region.toLowerCase()])];
      return Number(view?.regions?.find(entry => entry.name === item.name)?.value || 0);
    };
    const luc = countForType("LUC");
    const suc = countForType("SUC");
    return { ...item, luc, suc, other: Math.max(0, Number(item.value || 0) - luc - suc) };
  }) : regions;
  const availableRegions = sortRegions(snapshot?.availableRegions ?? snapshot?.regions?.map(item => item.name) ?? []);
  const totalCampuses = regions.reduce((sum, region) => sum + Number(region.value || 0), 0);
  const topRegion = [...regions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  const regionCount = regions.length;
  const groupedByInstitution = data?.locationDistributionGroup === "institution";
  const locationLabel = groupedByInstitution ? "Institution" : "Region";
  const selectInstitutionType = (type) => {
    setInstitutionType(type);
  };

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0b2342] to-[#123d6e] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">
              <MapPinned size={14} />
              Regional overview
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl uppercase">Regional Geographic Analysis</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Overview of campus distribution and regional coverage across participating institutions.
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Geographic analysis filters" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Filter geographic analysis</p>
            <p className="mt-0.5 text-xs text-slate-500">Choose an institution type, then narrow the coverage by region.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Institution type">
              {[["", "All"], ["LUC", "LUC"], ["SUC", "SUC"]].map(([value, label]) => (
                <button key={label} type="button" aria-pressed={institutionType === value} disabled={!snapshot?.filterViews} onClick={() => selectInstitutionType(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${institutionType === value ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>{label}</button>
              ))}
            </div>
            <label className="sr-only" htmlFor="geographic-region">Region</label>
            <select id="geographic-region" value={region} disabled={!snapshot?.filterViews} onChange={(event) => setRegion(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
              <option value="">All regions</option>
              {availableRegions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        {!snapshot?.filterViews && <p role="status" className="mt-3 text-xs text-amber-700">Filters are unavailable. Update the dashboard service, then refresh data.</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{groupedByInstitution ? "Institutions Tracked" : "Regions Tracked"}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{regionCount || 0}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Compass size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Campuses</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{totalCampuses}</p>
            </div>
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Top {locationLabel}</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{topRegion ? topRegion.name : "—"}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

      </section>

      <RegionalChart data={chartRegions} groupedByInstitution={groupedByInstitution} splitByType={Boolean(snapshot?.filterViews)} />

      {regions.length > 0 ? (
        <section aria-label="Geographic response volume" className="min-h-[560px] rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:min-h-[700px] sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Geographic overview</p>
              <h2 className="mt-2 flex items-center gap-2 text-xl font-bold text-slate-950"><MapPinned size={23} className="shrink-0 text-blue-600" />Response Volume by {locationLabel}</h2>
              <p className="mt-2 text-sm text-slate-400">{institutionType || "All institution types"} / {region || "All regions"}. Compare submission volume and share across each {locationLabel.toLowerCase()}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="max-w-[200px] rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Peak</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{topRegion.name} / {Number(topRegion.value || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Avg / {locationLabel}</p>
                <p className="mt-1 text-sm font-bold text-blue-700">{(totalCampuses / regionCount).toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span><strong className="text-slate-900">{totalCampuses.toLocaleString()}</strong> total responses</span>
            <span><strong className="text-slate-900">{regionCount}</strong> {groupedByInstitution ? "institutions" : "regions"} represented</span>
            <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-blue-600" />Responses</span>
            <span className="inline-flex items-center gap-2"><span className="w-5 border-t border-dashed border-slate-400" />Average: {(totalCampuses / regionCount).toFixed(1)}</span>
          </div>
          <div className="mt-8 overflow-x-auto" tabIndex={0} role="region" aria-label="Response volume chart">
            <div className="h-[380px] sm:h-[430px]" style={{ minWidth: Math.max(560, regions.length * (groupedByInstitution ? 150 : 75)) }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart accessibilityLayer data={sortRegions(chartRegions.map(item => item.name)).map(name => { const item = chartRegions.find(entry => entry.name === name); return { ...item, value: Number(item.value || 0) }; })} margin={{ top: 10, right: 12, bottom: 25, left: 0 }}>
                  <defs>
                    <linearGradient id="geographicVolumeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#dbe5f5" strokeDasharray="5 5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} height={groupedByInstitution ? 80 : 40} tick={{ fill: "#6482ac", fontSize: 11 }} tickMargin={10} tickFormatter={name => groupedByInstitution && name.length > 22 ? `${name.slice(0, 21)}...` : name} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#6482ac", fontSize: 12 }} width={48} domain={[0, "auto"]} />
                  <ReferenceLine y={totalCampuses / regionCount} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    const share = totalCampuses ? item.value / totalCampuses * 100 : 0;
                    return <div className="max-w-xs rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <dl className="mt-3 space-y-2">
                        <div className="flex justify-between gap-6"><dt className="text-slate-500">Responses</dt><dd className="font-bold text-blue-700">{item.value.toLocaleString()}</dd></div>
                        <div className="flex justify-between gap-6"><dt className="text-slate-500">Share of selection</dt><dd className="font-semibold">{share.toFixed(1)}%</dd></div>
                        {snapshot?.filterViews && [["LUC", item.luc], ["SUC", item.suc], ["Other / Unspecified", item.other]].map(([label, value]) => <div key={label} className="flex justify-between gap-6"><dt className="text-slate-500">{label}</dt><dd>{Number(value || 0).toLocaleString()}</dd></div>)}
                      </dl>
                    </div>;
                  }} />
                  <Area type="monotone" dataKey="value" name="Responses" stroke="#2563eb" strokeWidth={3.5} fill="url(#geographicVolumeFill)" dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
            <p><strong className="text-slate-900">{topRegion.name}</strong> has the most responses: <strong className="text-blue-700">{Number(topRegion.value || 0).toLocaleString()}</strong>, representing <strong className="text-blue-700">{(totalCampuses ? Number(topRegion.value || 0) / totalCampuses * 100 : 0).toFixed(1)}%</strong> of the current selection.</p>
            <p className="mt-2 text-xs text-slate-400">Hover over a point for counts and percentage share. Counts reflect survey submissions, which may include multiple responses from the same campus. The curve compares locations, not changes over time.</p>
          </div>
        </section>
      ) : (
        <section className="card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <MapPinned size={24} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No regional data available</h2>
          <p className="mt-2 text-sm text-slate-500">Add campus addresses to the source sheet to populate the geographic distribution.</p>
        </section>
      )}
      <RegionalParticipation institutionType={institutionType} region={region} />
    </div>
  );
}
