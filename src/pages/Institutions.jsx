
import { useEffect, useRef, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Eye, Search, X, Database } from "lucide-react";
import { getInstitutions, getSheetDataRevision } from "../services/api";
import Loading from "../components/common/Loading";

const institutionsPageCache = new Map();

export default function Institutions() {
  const [rows, setRows] = useState(() => institutionsPageCache.get("1:20:")?.rows || []);
  const [headers, setHeaders] = useState(() => institutionsPageCache.get("1:20:")?.headers || []);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(() => institutionsPageCache.get("1:20:")?.total || 0);
  const [institutionCount, setInstitutionCount] = useState(() => institutionsPageCache.get("1:20:")?.institutionCount || 0);
  const [lucCount, setLucCount] = useState(() => institutionsPageCache.get("1:20:")?.lucCount || 0);
  const [sucCount, setSucCount] = useState(() => institutionsPageCache.get("1:20:")?.sucCount || 0);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const tableRef = useRef(null);
  const cacheKey = `${getSheetDataRevision()}:${page}:${pageSize}:${q.trim().toLowerCase()}`;
  const initialPage = institutionsPageCache.get(cacheKey);
  const [loading, setLoading] = useState(!initialPage);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const cachedPage = institutionsPageCache.get(cacheKey);
      if (cachedPage) {
        setRows(cachedPage.rows);
        setHeaders(cachedPage.headers);
        setTotal(cachedPage.total);
        setInstitutionCount(cachedPage.institutionCount);
        setLucCount(cachedPage.lucCount);
        setSucCount(cachedPage.sucCount);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await getInstitutions({ page, pageSize, query: q.trim() });
        if (cancelled) return;
        const nextPage = { rows: result.data || [], headers: result.headers || [], total: Number(result.total) || 0, institutionCount: Number(result.institutionCount) || 0, lucCount: Number(result.lucCount) || 0, sucCount: Number(result.sucCount) || 0 };
        institutionsPageCache.set(cacheKey, nextPage);
        setRows(nextPage.rows);
        setHeaders(nextPage.headers);
        setTotal(nextPage.total);
        setInstitutionCount(nextPage.institutionCount);
        setLucCount(nextPage.lucCount);
        setSucCount(nextPage.sucCount);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load institutions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 300 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [page, pageSize, q, reloadKey, cacheKey]);

  useEffect(() => { setPage(1); }, [q, pageSize]);
  useEffect(() => {
    if (page !== 1 || q.trim() || !rows.length || institutionsPageCache.has("1:50:")) return;
    const timer = window.setTimeout(() => {
      getInstitutions({ page: 1, pageSize: 50 }).then(result => {
        institutionsPageCache.set("1:50:", { rows: result.data || [], headers: result.headers || [], total: Number(result.total) || 0, institutionCount: Number(result.institutionCount) || 0, lucCount: Number(result.lucCount) || 0, sucCount: Number(result.sucCount) || 0 });
      }).catch(() => {});
    }, 700);
    return () => window.clearTimeout(timer);
  }, [page, q, rows.length]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstRow = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(currentPage * pageSize, total);
  const loadInstitutions = () => { institutionsPageCache.delete(cacheKey); setReloadKey(value => value + 1); };
  const changePage = nextPage => {
    setPage(nextPage);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const changePageSize = nextPageSize => {
    const source = institutionsPageCache.get("1:50:") || institutionsPageCache.get("1:20:");
    if (source && source.rows.length >= Math.min(nextPageSize, total)) {
      const nextKey = `1:${nextPageSize}:`;
      const nextPage = { ...source, rows: source.rows.slice(0, nextPageSize) };
      institutionsPageCache.set(nextKey, nextPage);
      setRows(nextPage.rows); setHeaders(nextPage.headers); setTotal(nextPage.total); setInstitutionCount(nextPage.institutionCount); setLucCount(nextPage.lucCount); setSucCount(nextPage.sucCount);
    }
    setPage(1); setPageSize(nextPageSize);
  };

  // Do not allow a failed initial request to mask its error screen with the
  // full-page spinner.
  if (loading && !rows.length && !error) return <Loading variant="institutions" label="Reading institution responses..." />;

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
              Overview of participating institutions, campuses, facilities, and childcare development programs.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Records</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{total}</span>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total entries</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{total}</p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Database size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">LUC responses</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{lucCount}</p>
            </div>
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">SUC responses</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{sucCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Institutions</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{institutionCount}</p>
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
              <p className="mt-3 text-3xl font-semibold text-slate-900">{rows.length}</p>
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
        <p className="mt-2 text-xs text-slate-500">{total.toLocaleString()} matching response{total === 1 ? "" : "s"} · showing {firstRow.toLocaleString()}–{lastRow.toLocaleString()}</p>
      </div>

      <div ref={tableRef} className="card overflow-hidden scroll-mt-6">
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
              {rows.map(row => (
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
        {!rows.length && !loading && <div className="p-10 text-center text-sm text-slate-500">No matching responses.</div>}
        {total > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-slate-500">Showing <span className="font-semibold text-slate-700">{firstRow}–{lastRow}</span> of {total.toLocaleString()}</div>
          <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">Rows per page<select value={pageSize} onChange={event => changePageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-blue-600"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="flex items-center gap-1"><button type="button" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Previous page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-20 text-center text-xs font-medium text-slate-600">Page {currentPage} of {pageCount}</span><button type="button" onClick={() => changePage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="Next page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
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
