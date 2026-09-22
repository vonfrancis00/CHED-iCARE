
import { useState } from "react";
import { MapPinned, Building2, TrendingUp, Compass } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import RegionalChart from "../components/dashboard/RegionalChart";

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
  const availableRegions = sortRegions(data?.availableRegions ?? snapshot?.availableRegions ?? []);
  const totalCampuses = regions.reduce((sum, region) => sum + Number(region.value || 0), 0);
  const topRegion = [...regions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  const regionCount = regions.length;
  const groupedByInstitution = data?.locationDistributionGroup === "institution";
  const locationLabel = groupedByInstitution ? "Institution" : "Region";
  const selectInstitutionType = (type) => {
    setInstitutionType(type);
    setRegion("");
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
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Geographic Analysis</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Overview of campus distribution and regional coverage across participating institutions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Coverage</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{totalCampuses}</span>
              <span className="text-sm text-blue-100">campuses</span>
            </div>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Strongest Share</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{topRegion ? `${Math.round((Number(topRegion.value || 0) / Math.max(totalCampuses, 1)) * 100)}%` : "0%"}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <MapPinned size={22} />
            </div>
          </div>
        </div>
      </section>

      <RegionalChart data={regions} groupedByInstitution={groupedByInstitution} />

      {regions.length > 0 ? (
        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{locationLabel} Breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">Distribution of campus counts across each {locationLabel.toLowerCase()}.</p>
            </div>
          </div>

          <div className="space-y-3">
            {regions.map((region, index) => {
              const value = Number(region.value || 0);
              const share = totalCampuses > 0 ? (value / totalCampuses) * 100 : 0;
              return (
                <div key={region.name || index} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
                      <span className="font-medium text-slate-700">{region.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-500"
                      style={{ width: `${Math.max(share, 6)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-right text-xs text-slate-500">{share.toFixed(1)}% of campuses</div>
                </div>
              );
            })}
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
    </div>
  );
}
