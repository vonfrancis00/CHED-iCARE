
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import SoloParentChart from "../components/dashboard/SoloParentChart";
import StatCard from "../components/dashboard/StatCard";
import { Users, UserRound, UserRoundCheck } from "lucide-react";

export default function SoloParents() {
  const {data, loading} = useDashboard();
  if (loading) return <Loading />;
  const campus = data.soloParents.find(x => x.name === "Enrolled") || {};
  const community = data.soloParents.find(x => x.name === "Community") || {};
  return <div><h1 className="page-title">Solo Parents</h1><p className="mt-1 text-sm text-slate-500">Counts are calculated from the exact numeric fields in the survey.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Enrolled Total" value={campus.total} icon={Users}/><StatCard label="Enrolled Female" value={campus.female} icon={UserRound} tone="violet"/><StatCard label="Enrolled Male" value={campus.male} icon={UserRoundCheck} tone="blue"/></div><div className="mt-6 grid gap-6 xl:grid-cols-2"><SoloParentChart data={data.soloParents}/><div className="card p-6"><h2 className="font-semibold">Community Snapshot</h2><div className="mt-5 grid grid-cols-3 gap-3">{["total","female","male"].map(k => <div key={k} className="rounded-xl bg-slate-50 p-4"><div className="text-xs uppercase text-slate-400">{k}</div><div className="mt-1 text-xl font-bold">{Number(community[k] || 0).toLocaleString()}</div></div>)}</div></div></div></div>;
}
