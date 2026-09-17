
import { Building2, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import FacilityStatusChart from "../components/dashboard/FacilityStatusChart";
import ProgramStatusChart from "../components/dashboard/ProgramStatusChart";

export default function Childcare() {
  const { data, loading, error } = useDashboard();

  if (loading) return <Loading label="Loading facility and program insights..." />;
  if (error) {
    return (
      <div className="card p-8">
        <h2 className="font-semibold text-slate-900">Unable to load childcare analysis</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  const facility = data?.facilityQuestions ?? [];
  const program = data?.programQuestions ?? [];

  const facilityTotals = facility.reduce((acc, item) => {
    acc.yes += Number(item.yes || 0);
    acc.no += Number(item.no || 0);
    acc.planned += Number(item.planned || 0);
    return acc;
  }, { yes: 0, no: 0, planned: 0 });

  const programTotals = program.reduce((acc, item) => {
    acc.yes += Number(item.yes || 0);
    acc.no += Number(item.no || 0);
    acc.planned += Number(item.planned || 0);
    return acc;
  }, { yes: 0, no: 0, planned: 0 });

  const facilityCoverage = facility.length ? Math.round((facilityTotals.yes / (facilityTotals.yes + facilityTotals.no + facilityTotals.planned)) * 100) : 0;
  const programCoverage = program.length ? Math.round((programTotals.yes / (programTotals.yes + programTotals.no + programTotals.planned)) * 100) : 0;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">
              <Building2 size={14} />
              Childcare readiness
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Childcare Facilities & Programs</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Exact response counts from the childcare facility and documented program questions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Response mix</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{facilityCoverage}%</span>
              <span className="text-sm text-blue-100">Facility Yes-rate</span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Facility Yes</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{facilityTotals.yes}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Facility Planned</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{facilityTotals.planned}</p>
            </div>
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Program Yes</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{programTotals.yes}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Program Coverage</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{programCoverage}%</p>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <ClipboardList size={22} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <FacilityStatusChart data={facility} />
        <ProgramStatusChart data={program} />
      </div>
    </div>
  );
}
