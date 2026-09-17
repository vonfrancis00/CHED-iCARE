
import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Eye, Search, X, Database } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  useEffect(() => { setPage(1); }, [q, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRow = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(currentPage * pageSize, filtered.length);

  // Do not allow a failed initial request to mask its error screen with the
  // full-page spinner.
  if (loading && !error) return <Loading label="Reading all survey responses..." />;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">
              <Building2 size={14} />
              Institution registry
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Institutions</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              This table is populated directly from all rows in Form Responses 1.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Records</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{rows.length}</span>
              <span className="text-sm text-blue-100">entries</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">Unable to load institutions</div>
          <p className="mt-1">{error}</p>
          <button onClick={loadInstitutions} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total entries</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{rows.length}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Database size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Institutions</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{new Set(rows.map((row) => row["Name of Institution"]).filter(Boolean)).size}</p>
            </div>
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Visible rows</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{filtered.length}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Search size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search any of the 31 fields..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 outline-none focus:border-blue-500"/>
        </div>
        <p className="mt-2 text-xs text-slate-500">{filtered.length.toLocaleString()} matching response{filtered.length === 1 ? "" : "s"} · showing {firstRow.toLocaleString()}–{lastRow.toLocaleString()}</p>
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
              {pageRows.map(row => (
                <tr key={row.rowNumber} className="hover:bg-slate-50">
                  <td className="sticky left-0 bg-white px-5 py-4 font-semibold text-slate-900">{row["Name of Institution"] || "—"}</td>
                  <td className="px-5 py-4">{row["Name of Institution Campus"] || "—"}</td>
                  <td className="max-w-sm px-5 py-4">{row["Address of Campus"] || "—"}</td>
                  <td className="px-5 py-4">{row.facilityFaculty || "—"}</td>
                  <td className="px-5 py-4">{row.facilityStudents || "—"}</td>
                  <td className="px-5 py-4">{row.programStudents || "—"}</td>
                  <td className="px-5 py-4 text-right"><button onClick={() => setSelected(row)} className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"><Eye size={17}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <div className="p-10 text-center text-sm text-slate-500">No matching responses.</div>}
        {filtered.length > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-slate-500">Showing <span className="font-semibold text-slate-700">{firstRow}–{lastRow}</span> of {filtered.length.toLocaleString()}</div>
          <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">Rows per page<select value={pageSize} onChange={event => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-blue-600"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="flex items-center gap-1"><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="Previous page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-20 text-center text-xs font-medium text-slate-600">Page {currentPage} of {pageCount}</span><button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} aria-label="Next page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
        </div>}
      </div>

      {selected && <DetailsModal row={selected} headers={headers} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailsModal({ row, headers, onClose }) {
  const institutionName = row["Name of Institution"] || "Survey Response";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[26px] border border-blue-200/20 bg-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-[#0b1f3a] via-[#0e294d] to-[#123c6d] px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-blue-100 shadow-inner shadow-white/10">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{institutionName}</h2>
              <p className="mt-1 text-xs text-blue-100">Google Sheet row {row.rowNumber}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label="Close institution details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-108px)] overflow-y-auto bg-slate-100/90 p-4 sm:p-5">
          <div className="rounded-[22px] border border-slate-200 bg-white/85 p-3 shadow-inner shadow-slate-200/60 sm:p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {headers.map(header => {
                const value = row[header];
                const displayValue = value === "" || value == null ? "—" : String(value);

                return (
                  <div
                    key={header}
                    className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm transition hover:border-blue-200 hover:bg-slate-50"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {header}
                    </div>
                    <div className="mt-3 whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-slate-800">
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
