
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import RegionalChart from "../components/dashboard/RegionalChart";

export default function Geographic() {
  const {data, loading} = useDashboard();
  if (loading) return <Loading />;
  return <div><h1 className="page-title">Geographic Analysis</h1><p className="mt-1 text-sm text-slate-500">Location groups are derived only from the Address of Campus field; the raw address remains available in Institutions.</p><RegionalChart data={data.regions}/></div>;
}
