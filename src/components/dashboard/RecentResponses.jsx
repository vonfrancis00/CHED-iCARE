
import { Link } from "react-router-dom";

export default function RecentResponses({ data = [] }) {
  return (
    <section className="card mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div><h2 className="font-semibold">Recent Survey Responses</h2><p className="mt-1 text-xs text-slate-500">Latest rows from Form Responses 1</p></div>
        <Link to="/institutions" className="text-sm font-semibold text-teal-700 hover:text-teal-800">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-5 py-3">Institution</th><th className="px-5 py-3">Campus</th><th className="px-5 py-3">Address</th><th className="px-5 py-3">Facility / Faculty</th><th className="px-5 py-3">Program / Students</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(row => <tr key={row.rowNumber} className="hover:bg-slate-50">
              <td className="px-5 py-3 font-medium text-slate-800">{row.HEI || "—"}</td>
              <td className="px-5 py-3 text-slate-500">{row["Name of Institution Campus"] || "—"}</td>
              <td className="max-w-xs px-5 py-3 text-slate-500">{row["Address of Campus"] || "—"}</td>
              <td className="px-5 py-3">{row.facilityFaculty || "—"}</td>
              <td className="px-5 py-3">{row.programStudents || "—"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
