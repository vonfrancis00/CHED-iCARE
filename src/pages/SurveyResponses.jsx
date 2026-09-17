import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Database, MapPin, Building2 } from "lucide-react";
import { getSurveyResponses } from "../services/api";
import Loading from "../components/common/Loading";

const surveyPageCache = new Map();

const FIELD_MAP = {
  institution: "Name of Institution",
  campus: "Name of Institution Campus",
  address: "Address of Campus"
};

function display(value) {
  return value === "" || value == null ? "-" : String(value);
}

export default function SurveyResponses() {
  const [rows, setRows] = useState(() => surveyPageCache.get("1:20")?.rows || []);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(() => surveyPageCache.get("1:20")?.total || 0);
  const [institutionCount, setInstitutionCount] = useState(() => surveyPageCache.get("1:20")?.institutionCount || 0);
  const [campusCount, setCampusCount] = useState(() => surveyPageCache.get("1:20")?.campusCount || 0);
  const [loading, setLoading] = useState(() => !surveyPageCache.get("1:20"));
  const tableRef = useRef(null);
  const cacheKey = `${page}:${pageSize}`;

  useEffect(() => {
    let active = true;
    const cachedPage = surveyPageCache.get(cacheKey);
    if (cachedPage) {
      setRows(cachedPage.rows);
      setTotal(cachedPage.total);
      setInstitutionCount(cachedPage.institutionCount);
      setCampusCount(cachedPage.campusCount);
      setLoading(false);
      return () => { active = false; };
    }
    setError(""); setLoading(true);

    getSurveyResponses({ page, pageSize })
      .then((result) => {
        if (!active) return;
        const nextPage = { rows: Array.isArray(result.data) ? result.data : [], total: Number(result.total) || 0, institutionCount: Number(result.institutionCount) || 0, campusCount: Number(result.campusCount) || 0 };
        surveyPageCache.set(cacheKey, nextPage);
        setRows(nextPage.rows);
        setTotal(nextPage.total);
        setInstitutionCount(nextPage.institutionCount);
        setCampusCount(nextPage.campusCount);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Unable to load survey responses");
        setRows([]);
      }).finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
    };
  }, [attempt, cacheKey, page, pageSize]);

  useEffect(() => { setPage(1); }, [pageSize]);
  useEffect(() => {
    if (page !== 1 || !rows.length || surveyPageCache.has("1:50")) return;
    const timer = window.setTimeout(() => {
      getSurveyResponses({ page: 1, pageSize: 50 }).then(result => {
        surveyPageCache.set("1:50", { rows: Array.isArray(result.data) ? result.data : [], total: Number(result.total) || 0, institutionCount: Number(result.institutionCount) || 0, campusCount: Number(result.campusCount) || 0 });
      }).catch(() => {});
    }, 700);
    return () => window.clearTimeout(timer);
  }, [page, rows.length]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(page * pageSize, total);
  const changePage = nextPage => { setPage(nextPage); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const changePageSize = nextPageSize => {
    const source = surveyPageCache.get("1:50") || surveyPageCache.get("1:20");
    if (source && source.rows.length >= Math.min(nextPageSize, total)) {
      const nextPage = { ...source, rows: source.rows.slice(0, nextPageSize) };
      surveyPageCache.set(`1:${nextPageSize}`, nextPage);
      setRows(nextPage.rows); setTotal(nextPage.total); setInstitutionCount(nextPage.institutionCount); setCampusCount(nextPage.campusCount);
    }
    setPage(1); setPageSize(nextPageSize);
  };

  // Prefer a useful error/retry panel to an indefinite-looking loader.
  if (loading && !rows?.length && !error) return <Loading label="Reading survey responses..." />;
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
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Survey Responses</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Survey responses from the connected Google Sheet.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <div className="text-[11px] uppercase tracking-[0.18em] text-blue-100">Records</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold">{total}</span>
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
              <p className="mt-3 text-3xl font-semibold text-slate-900">{institutionCount}</p>
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
              <p className="mt-3 text-3xl font-semibold text-slate-900">{campusCount}</p>
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
              <p className="mt-3 text-3xl font-semibold text-slate-900">{total}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Database size={22} />
            </div>
          </div>
        </div>
      </div>

      <div ref={tableRef} className="card overflow-hidden scroll-mt-6">
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
        {total > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="text-slate-500">Showing <span className="font-semibold text-slate-700">{firstRow}–{lastRow}</span> of {total.toLocaleString()}</div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">Rows per page<select value={pageSize} onChange={event => changePageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-blue-600"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="flex items-center gap-1"><button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-20 text-center text-xs font-medium text-slate-600">Page {page} of {pageCount}</span><button type="button" onClick={() => changePage(Math.min(pageCount, page + 1))} disabled={page === pageCount} aria-label="Next page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div></div></div>}
      </div>
    </div>
  );
}
