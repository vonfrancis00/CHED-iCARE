
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import StatCard from "../components/dashboard/StatCard";
import FacilityStatusChart from "../components/dashboard/FacilityStatusChart";
import ProgramStatusChart from "../components/dashboard/ProgramStatusChart";
import RegionalChart from "../components/dashboard/RegionalChart";
import SoloParentChart from "../components/dashboard/SoloParentChart";
import OCCChart from "../components/dashboard/OCCChart";
import { Building2, Baby, Users, FileCheck, MapPin } from "lucide-react";

export default function Dashboard() {
  const { data, loading, refreshing, error, reload } = useDashboard();

  if (loading && !data) return <Loading label="Reading Google Sheet data..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold">Unable to load dashboard</h2><p className="mt-2 text-sm text-slate-500">{error}</p><button onClick={reload} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  const o = data.overview;
  const occOffices = (data.occOffices?.length ? data.occOffices : data.occDistribution || [])
    .filter((office) => String(office.name || "").toLowerCase().includes("office"));
  return (
    <div>
      <div role="status" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>{data.cachedAt || data.updatedAt ? `Last updated: ${new Date(data.cachedAt || data.updatedAt).toLocaleString()}` : "Showing saved data"}</span>
        {refreshing && <span>Refreshing…</span>}
        {error && <span className="text-amber-700">Could not refresh. Showing the last saved data.</span>}
        <button onClick={reload} disabled={refreshing} className="font-semibold text-teal-700 disabled:opacity-50">Refresh</button>
      </div>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Childcare Development Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Values are calculated from the actual Form Responses 1 sheet.</p>
        </div>
        <div className="rounded-xl bg-teal-50 px-4 py-2 text-xs font-medium text-teal-800">
          Source: {data.source === "google-sheet" ? "Google Sheet" : "Demo data"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Survey Responses" value={o.totalResponses} hint="Rows with responses" icon={Building2} />
        <StatCard label="Facility — Faculty" value={o.facilityFacultyYes} hint="Exact Yes responses" icon={Baby} tone="blue" />
        <StatCard label="Facility — Students" value={o.facilityStudentsYes} hint="Exact Yes responses" icon={Users} tone="teal" />
        <StatCard label="Program — Students" value={o.programStudentsYes} hint="Exact Yes responses" icon={FileCheck} tone="amber" />
        <StatCard label="Enrolled Solo Parents" value={o.enrolledSoloParents} hint="Sum of numeric responses" icon={Users} tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <FacilityStatusChart data={data.facilityQuestions} />
        <ProgramStatusChart data={data.programQuestions} />
      </div>

      <RegionalChart data={data.regions} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SoloParentChart data={data.soloParents} />
        <OCCChart data={occOffices} />
      </div>

    </div>
  );
}
