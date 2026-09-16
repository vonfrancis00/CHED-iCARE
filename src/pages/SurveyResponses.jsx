import { useEffect, useState } from "react";
import { Database, MapPin, Building2 } from "lucide-react";
import { getSurveyResponses } from "../services/api";
import Loading from "../components/common/Loading";

let surveyResponsesCache = null;

const FIELD_MAP = {
  institution: "Name of Institution",
  campus: "Name of Institution Campus",
  address: "Address of Campus"
};

function display(value) {
  return value === "" || value == null ? "-" : String(value);
}

export default function SurveyResponses() {
  const [rows, setRows] = useState(surveyResponsesCache);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);

    getSurveyResponses()
      .then((result) => {
        if (!active) return;
        const nextRows = Array.isArray(result.data) ? result.data : [];
        surveyResponsesCache = nextRows;
        setRows(nextRows);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Unable to load survey responses");
        if (!surveyResponsesCache) {
          setRows([]);
        }
      }).finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (loading && !rows?.length) return <Loading label="Reading survey responses..." />;
  if (error && !rows?.length) return <div role="alert" className="card p-8"><h2 className="font-semibold">Unable to load survey responses</h2><p className="mt-2 text-sm">{error}</p><button onClick={() => setAttempt(value => value + 1)} className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-white">Retry</button></div>;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">
              <Database size={14} />
              Raw data
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Survey Responses</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Survey responses from the connected Google Sheet.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Records</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{rows.length}</span>
              <span className="text-sm text-blue-100">responses</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Institutions</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{new Set(rows.map((row) => row[FIELD_MAP.institution]).filter(Boolean)).size}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Campuses</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{new Set(rows.map((row) => row[FIELD_MAP.campus]).filter(Boolean)).size}</p>
            </div>
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
              <MapPin size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active rows</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{rows.length}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Database size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Institution</th>
                <th className="px-5 py-3">Campus</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Facility</th>
                <th className="px-5 py-3">Program</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.rowNumber ?? index} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {display(row[FIELD_MAP.institution])}
                  </td>
                  <td className="px-5 py-4">{display(row[FIELD_MAP.campus])}</td>
                  <td className="max-w-sm px-5 py-4">{display(row[FIELD_MAP.address])}</td>
                  <td className="px-5 py-4">{display(row.facilityStudents || row.facilityFaculty)}</td>
                  <td className="px-5 py-4">{display(row.programStudents || row.programFaculty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!rows.length && !error && (
          <div className="p-10 text-center text-sm text-slate-500">No survey responses found.</div>
        )}
      </div>
    </div>
  );
}
