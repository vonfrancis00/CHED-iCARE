
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import SoloParentChart from "../components/dashboard/SoloParentChart";
import StatCard from "../components/dashboard/StatCard";
import { Users, UserRound, UserRoundCheck, HeartHandshake } from "lucide-react";

export default function SoloParents() {
  const { data, loading, error } = useDashboard();

  if (loading) return <Loading label="Loading solo parent insights..." />;
  if (error) {
    return (
      <div className="card p-8">
        <h2 className="font-semibold text-slate-900">Unable to load solo parent data</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  const soloParents = data?.soloParents ?? [];
  const campus = soloParents.find((x) => x.name === "Enrolled") || {};
  const community = soloParents.find((x) => x.name === "Community") || {};

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">
              <HeartHandshake size={14} />
              Family support
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Solo Parents</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Counts are calculated from the exact numeric fields in the survey.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Enrolled total</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{Number(campus.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled Total" value={campus.total} icon={Users} />
        <StatCard label="Enrolled Female" value={campus.female} icon={UserRound} tone="violet" />
        <StatCard label="Enrolled Male" value={campus.male} icon={UserRoundCheck} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SoloParentChart data={soloParents} />

        <div className="rounded-[30px] border border-slate-200 bg-[#edf2f5] p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-8">
          <div className="space-y-2">
            <h2 className="text-[clamp(2.1rem,2.5vw,3rem)] font-semibold leading-tight tracking-[-0.055em] text-slate-800">Community snapshot</h2>
            <p className="text-[1.05rem] leading-relaxed text-slate-500">Breakdown of reported community support counts.</p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              { key: "total", label: "TOTAL" },
              { key: "female", label: "FEMALE" },
              { key: "male", label: "MALE" }
            ].map(({ key, label }) => (
              <div
                key={key}
                className="flex min-h-[150px] flex-col justify-center rounded-[20px] border border-slate-200 bg-[#f6f8fa] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
              >
                <div className="text-[0.73rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                <div className="mt-4 font-mono text-[clamp(2.2rem,2.8vw,3.25rem)] font-black leading-none tracking-[-0.08em] text-slate-900 tabular-nums">
                  {Number(community[key] || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
