
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import StatCard from "../components/dashboard/StatCard";
import FacilityStatusChart from "../components/dashboard/FacilityStatusChart";
import ProgramStatusChart from "../components/dashboard/ProgramStatusChart";
import RegionalChart from "../components/dashboard/RegionalChart";
import SoloParentChart from "../components/dashboard/SoloParentChart";
import OCCChart from "../components/dashboard/OCCChart";
import { Building2, Baby, Users, FileCheck, RefreshCw, ShieldCheck } from "lucide-react";

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
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-[#123b70] bg-[linear-gradient(115deg,#061a38_0%,#082b59_55%,#0e427d_100%)] px-5 py-6 shadow-[0_14px_30px_-18px_rgba(6,27,58,0.85)] sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-sky-200/15" />
        <div className="pointer-events-none absolute right-16 top-8 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <img src="/ched-logo.png" alt="Commission on Higher Education" className="mt-0.5 h-14 w-14 rounded-full bg-white/95 p-1.5 shadow-lg" />
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200">CHED Central Office · Monitoring dashboard</p>
              <h1 className="page-title font-extrabold !text-white">Childcare Development Overview</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">A single, reliable view of institutional responses, program readiness, and support for Filipino families.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <div className="flex items-center gap-2 text-xs text-sky-100"><ShieldCheck size={16} className="text-cyan-200" /> Secure internal platform</div>
            <button onClick={() => reload({ force: true })} disabled={refreshing} className="inline-flex items-center gap-2 rounded-full border border-sky-200/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </div>
        {/* <div className="mt-4 shrink-0 rounded-full border border-sky-300/30 bg-white/10 px-4 py-2 text-xs font-semibold text-sky-100 shadow-sm backdrop-blur-sm sm:mt-0">
          Source: {data.source === "google-sheet" ? "Google Sheet" : "Demo data"}
        </div> */}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
        <span>{data.cachedAt || data.updatedAt ? `Last updated ${new Date(data.cachedAt || data.updatedAt).toLocaleString()}` : "Showing saved data"}</span>
        {error && <span className="font-medium text-amber-700">Could not refresh; showing the last saved data.</span>}
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
