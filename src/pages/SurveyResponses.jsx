import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Database, LoaderCircle, MapPin, Building2, Search } from "lucide-react";
import { useInstitutionPage } from "../hooks/useInstitutionPage";
import Loading from "../components/common/Loading";


const FIELD_MAP = {
  institution: "Name of Institution",
  campus: "Name of Institution Campus",
  address: "Address of Campus"
};

function display(value) {
  return value === "" || value == null ? "-" : String(value);
}

function sortRegions(regions) {
  return [...regions].sort((a, b) => {
    const aNumber = /^Region\s+(\d+)$/i.exec(a)?.[1];
    const bNumber = /^Region\s+(\d+)$/i.exec(b)?.[1];
    if (aNumber && bNumber) return Number(aNumber) - Number(bNumber);
    if (aNumber) return -1;
    if (bNumber) return 1;
    return a.localeCompare(b);
  });
}

export default function SurveyResponses() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [query, setQuery] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [region, setRegion] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const tableRef = useRef(null);
  const { data, loading, error, reload, hasCurrentData } = useInstitutionPage(page, pageSize, query, { institutionType, region });
  const rows = data?.data || [];
  const isFilterLoading = filterPending && !hasCurrentData && !error;
  const visibleRows = isFilterLoading ? [] : rows;
  const total = Number(data?.total) || 0;
  const institutionCount = Number(data?.institutionCount) || 0;
  const campusCount = Number(data?.campusCount) || 0;
  const regions = sortRegions(data?.regions || []);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstRow = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(currentPage * pageSize, total);
  const changePage = nextPage => { setPage(nextPage); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const changePageSize = nextPageSize => { setPage(1); setPageSize(nextPageSize); };

  useEffect(() => {
    if (hasCurrentData || error) setFilterPending(false);
  }, [error, hasCurrentData]);

  // Prefer a useful error/retry panel to an indefinite-looking loader.
  if (loading && !data && !error) return <Loading variant="responses" label="Reading survey responses..." />;
  if (error && !rows?.length) return <div role="alert" className="card p-8"><h2 className="font-semibold">Unable to load survey responses</h2><p className="mt-2 text-sm">{error}</p><button onClick={reload} className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-white">Retry</button></div>;

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
              Overview of submitted survey data, participating institutions, campuses, and childcare program responses.
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
          {error} <button onClick={reload} className="ml-3 underline">Retry</button>
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

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_220px]">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
            <input value={query} onChange={event => { setFilterPending(true); setPage(1); setQuery(event.target.value); }} placeholder="Search survey responses…" aria-label="Search survey responses" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500" />
          </div>
          <div
            role="group"
            aria-label="Filter survey responses by institution type"
            className="inline-flex rounded-xl bg-slate-100 p-1"
          >
            {[['', 'All'], ['LUC', 'LUC'], ['SUC', 'SUC']].map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                aria-pressed={institutionType === value}
                onClick={() => { setFilterPending(true); setPage(1); setInstitutionType(value); }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${institutionType === value ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={region} onChange={event => { setFilterPending(true); setPage(1); setRegion(event.target.value); }} aria-label="Filter survey responses by region" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500">
            <option value="">All regions</option>
            {regions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div ref={tableRef} className="card overflow-hidden scroll-mt-6" aria-busy={loading}>
        {(loading || isFilterLoading) && <div role="status" className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-800"><LoaderCircle size={16} className="animate-spin" />{isFilterLoading ? "Applying filters…" : "Loading responses…"}</div>}
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
              {visibleRows.map((row, index) => (
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

        {!visibleRows.length && !error && !isFilterLoading && (
          <div className="p-10 text-center text-sm text-slate-500">No survey responses found.</div>
        )}
        {total > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="text-slate-500">Showing <span className="font-semibold text-slate-700">{firstRow}–{lastRow}</span> of {total.toLocaleString()}</div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">Rows per page<select value={pageSize} onChange={event => changePageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-blue-600"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="flex items-center gap-1"><button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-20 text-center text-xs font-medium text-slate-600">Page {page} of {pageCount}</span><button type="button" onClick={() => changePage(Math.min(pageCount, page + 1))} disabled={page === pageCount} aria-label="Next page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div></div></div>}
      </div>
    </div>
  );
}
