
import { useEffect, useMemo, useState } from "react";
import { Eye, Search, X } from "lucide-react";
import { getInstitutions } from "../services/api";
import Loading from "../components/common/Loading";

let institutionsCache = {
  rows: null,
  headers: []
};

export default function Institutions() {
  const [rows, setRows] = useState(institutionsCache.rows || []);
  const [headers, setHeaders] = useState(institutionsCache.headers);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(!institutionsCache.rows);
  const [error, setError] = useState("");

  const loadInstitutions = () => {
    setLoading(!institutionsCache.rows);
    setError("");
    getInstitutions()
      .then(r => {
        const nextRows = r.data || [];
        const nextHeaders = r.headers || [];
        institutionsCache = { rows: nextRows, headers: nextHeaders };
        setRows(nextRows);
        setHeaders(nextHeaders);
      })
      .catch(err => {
        if (!institutionsCache.rows) {
          setRows([]);
          setHeaders([]);
        }
        setError(err.message || "Unable to load institutions");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter(row =>
      Object.values(row).some(v => String(v ?? "").toLowerCase().includes(query))
    );
  }, [rows, q]);

  if (loading) return <Loading label="Reading all survey responses..." />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Institutions</h1>
        <p className="mt-1 text-sm text-slate-500">This table is populated directly from all rows in <b>Form Responses 1</b>.</p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Unable to load institutions</div>
          <p className="mt-1">{error}</p>
          <button onClick={loadInstitutions} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800">
            Retry
          </button>
        </div>
      )}

      <div className="card mb-5 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search any of the 31 fields..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-teal-500"/>
        </div>
        <p className="mt-2 text-xs text-slate-500">{filtered.length.toLocaleString()} of {rows.length.toLocaleString()} responses shown</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3">Institution</th>
                <th className="px-5 py-3">Campus</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Facility — Faculty</th>
                <th className="px-5 py-3">Facility — Students</th>
                <th className="px-5 py-3">Program — Students</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(row => (
                <tr key={row.rowNumber} className="hover:bg-slate-50">
                  <td className="sticky left-0 bg-white px-5 py-4 font-semibold">{row["Name of Institution"] || "—"}</td>
                  <td className="px-5 py-4">{row["Name of Institution Campus"] || "—"}</td>
                  <td className="max-w-sm px-5 py-4">{row["Address of Campus"] || "—"}</td>
                  <td className="px-5 py-4">{row.facilityFaculty || "—"}</td>
                  <td className="px-5 py-4">{row.facilityStudents || "—"}</td>
                  <td className="px-5 py-4">{row.programStudents || "—"}</td>
                  <td className="px-5 py-4 text-right"><button onClick={() => setSelected(row)} className="rounded-lg border border-slate-200 p-2 hover:bg-white"><Eye size={17}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <div className="p-10 text-center text-sm text-slate-500">No matching responses.</div>}
      </div>

      {selected && <DetailsModal row={selected} headers={headers} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailsModal({ row, headers, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-bold">{row["Name of Institution"] || "Survey Response"}</h2>
            <p className="text-xs text-slate-500">Google Sheet row {row.rowNumber}</p>
          </div>
          <button onClick={onClose}><X/></button>
        </div>
        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {headers.map(header => {
              const value = row[header];
              return <div key={header} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{header}</div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{value === "" || value == null ? "—" : String(value)}</div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
