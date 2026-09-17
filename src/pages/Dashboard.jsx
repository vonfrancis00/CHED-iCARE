
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
    <div className="dashboard-overview rounded-3xl border border-[#bfd0e5] bg-[#f6f9fd]/85 p-4 shadow-[0_20px_55px_-42px_rgba(6,27,58,0.6)] backdrop-blur-sm sm:p-6">
      <div role="status" className="hidden">
        <span>{data.cachedAt || data.updatedAt ? `Last updated: ${new Date(data.cachedAt || data.updatedAt).toLocaleString()}` : "Showing saved data"}</span>
        {refreshing && <span>Refreshing…</span>}
        {error && <span className="text-amber-700">Could not refresh. Showing the last saved data.</span>}
        <button onClick={() => reload({ force: true })} disabled={refreshing} className="rounded-full bg-[#08264d] px-3 py-1.5 font-semibold text-white transition hover:bg-[#0e427d] disabled:opacity-50">Refresh</button>
      </div>
      <div className="relative mb-7 overflow-hidden rounded-2xl border border-[#123b70] bg-[linear-gradient(115deg,#061a38_0%,#082b59_55%,#0e427d_100%)] px-5 py-5 shadow-[0_14px_30px_-18px_rgba(6,27,58,0.85)] sm:flex sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">Monitoring dashboard</p>
          <h1 className="page-title font-extrabold uppercase !text-white">Childcare Development Overview</h1>
          <p className="mt-2 text-sm leading-6 text-blue-100">Real-time monitoring of childcare development data, progress, and key performance indicators.</p>
        </div>
        {/* <div className="mt-4 shrink-0 rounded-full border border-sky-300/30 bg-white/10 px-4 py-2 text-xs font-semibold text-sky-100 shadow-sm backdrop-blur-sm sm:mt-0">
          Source: {data.source === "google-sheet" ? "Google Sheet" : "Demo data"}
        </div> */}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Survey Responses" value={o.totalResponses} hint={`LUCs: ${o.lucResponses ?? 0} · SUCs: ${o.sucResponses ?? 0}`} icon={Building2} />
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
