
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import FacilityStatusChart from "../components/dashboard/FacilityStatusChart";
import ProgramStatusChart from "../components/dashboard/ProgramStatusChart";

export default function Childcare() {
  const {data, loading} = useDashboard();
  if (loading) return <Loading />;
  return <div><h1 className="page-title">Childcare Facilities & Programs</h1><p className="mt-1 text-sm text-slate-500">Exact response counts from the childcare facility and documented program questions.</p><div className="mt-6 grid gap-6 xl:grid-cols-2"><FacilityStatusChart data={data.facilityQuestions}/><ProgramStatusChart data={data.programQuestions}/></div></div>;
}
