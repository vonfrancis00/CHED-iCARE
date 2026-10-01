
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, ChevronLeft, ChevronRight, Eye, Search, X, Database, LoaderCircle, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useInstitutionGroups } from "../hooks/useInstitutionGroups";
import { groupCampuses, groupInstitutions } from "../utils/institutionGroups";
import Loading from "../components/common/Loading";

function matchesFilters(row, institutionType, region) {
  const type = String(row["SUC/LUC"] || "").trim().toUpperCase();
  const rowRegion = String(row.Region || "").trim().toLowerCase();
  return (!institutionType || type === institutionType) && (!region || rowRegion === region.trim().toLowerCase());
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

export default function Institutions() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const tableRef = useRef(null);
  const [q, setQ] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [region, setRegion] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const { data: currentData, loading, error, reload, hasCurrentData, backgroundLoading } = useInstitutionGroups(q, institutionType, region);
  const [lastData, setLastData] = useState(null);
  // Keep the page and region options mounted while a new filter request runs.
  const data = currentData || lastData;
  useEffect(() => {
    if (currentData) setLastData(currentData);
  }, [currentData]);
  // The API filters records as well, but keep this guard at the UI boundary so
  // a stale deployment or cached response can never show a LUC as a SUC.
  const rows = (data?.data || []).filter(row => matchesFilters(row, institutionType, region)
    && String(row.Institution || "").toLowerCase().includes(q.trim().toLowerCase()));
  const headers = data?.headers || [];
  const total = Number(data?.total) || 0;
  const regions = sortRegions(data?.regions || []);
  const groups = useMemo(() => groupInstitutions(rows, "Institution"), [data, institutionType, region, q]);
  // Count named institutions once, regardless of their number of responses.
  const namedGroups = groups.filter(group => group.key.startsWith("name:"));
  const respondedCount = namedGroups.length;
  const countType = type => namedGroups.filter(group => group.rows.some(row =>
    String(row["SUC/LUC"] || "").trim().toUpperCase() === type
  )).length;
  const lucCount = countType("LUC");
  const sucCount = countType("SUC");
  const institutionCount = groups.length;
  const pageCount = Math.max(1, Math.ceil(institutionCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstRow = institutionCount ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(currentPage * pageSize, institutionCount);
  const isSearching = loading && Boolean(q);
  const isPageLoading = loading && Boolean(data);
  const isFilterLoading = filterPending && !hasCurrentData && !error;
  const visibleGroups = !hasCurrentData ? [] : groups.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const loadInstitutions = reload;
  const hasFilters = Boolean(q || institutionType || region);
  const resetFilters = () => {
    setFilterPending(true);
    setQ(""); setInstitutionType(""); setRegion(""); setPage(1);
  };
  const changePage = nextPage => { setPage(nextPage); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const changePageSize = nextPageSize => { setPage(1); setPageSize(nextPageSize); };

  useEffect(() => { setExpanded(null); }, [q, institutionType, region, page, pageSize]);

  useEffect(() => {
    if (hasCurrentData || error) setFilterPending(false);
  }, [error, hasCurrentData]);

  // Do not allow a failed initial request to mask its error screen with the
  // full-page spinner.
  if (loading && !data && !error) return <Loading variant="institutions" label="Reading institution responses..." />;

  return (
    <div className="institutions-page space-y-6">
      <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">
              <Building2 size={14} />
              Institution registry
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl uppercase">Institutions</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
              Overview of participating institutions, campuses, facilities, and childcare development programs.
            </p>
          </div>
          <button type="button" onClick={loadInstitutions} disabled={loading || backgroundLoading} className="institution-refresh inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-60 lg:self-auto">
            <RefreshCw size={17} className={loading || backgroundLoading ? "animate-spin" : ""} aria-hidden="true" />
            {loading || backgroundLoading ? "Refreshing…" : "Refresh directory"}
          </button>
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

      <div className="institution-metrics grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Institutions Responded</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{respondedCount}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
              <Database size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Local Universities and Colleges</p>
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
              <p className="text-sm text-slate-500">State Universities and Colleges</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{sucCount}</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <Building2 size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="institution-filters card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800"><SlidersHorizontal size={16} className="text-blue-600" aria-hidden="true" />Find institutions</h2>
          {hasFilters && <button type="button" onClick={resetFilters} className="institution-reset inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><X size={14} aria-hidden="true" />Clear filters</button>}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_220px]">
          <div className="relative">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18}/>
          <input value={q} onChange={e => { setFilterPending(true); setPage(1); setQ(e.target.value); }} placeholder="Search by institution name?" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 outline-none focus:border-blue-500" aria-label="Search institutions" aria-busy={isSearching}/>
          {isSearching && <LoaderCircle className="absolute right-3 top-3.5 animate-spin text-blue-600" size={18} aria-label="Searching"/>}
        </div>
          <div
            role="group"
            aria-label="Filter by institution type"
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
          <select value={region} onChange={event => { setFilterPending(true); setPage(1); setRegion(event.target.value); }} aria-label="Filter by region" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="">All Regions</option>{regions.map(item => <option key={item} value={item}>{item}</option>)}</select>
        </div>
        <p className="mt-3 text-xs text-slate-500" role="status">{total.toLocaleString()} matching response{total === 1 ? "" : "s"} · {institutionCount.toLocaleString()} institutions · showing {firstRow.toLocaleString()}–{lastRow.toLocaleString()}</p>
      </div>

      <div ref={tableRef} className="institution-directory card overflow-hidden scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Institutions Directory</h2>
            <p className="mt-1 text-xs text-slate-500">Select an institution to view its campuses, then select a campus to view its responses.</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{institutionCount.toLocaleString()} institutions</span>
        </div>
        {(backgroundLoading || isPageLoading || isFilterLoading) && <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-5 py-2.5 text-xs font-medium text-blue-800" role="status"><LoaderCircle size={15} className="animate-spin"/>{isFilterLoading ? "Applying filters…" : "Loading remaining responses in the background..."}</div>}
        <div className="overflow-x-auto">
          <table className="institution-groups text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th scope="col" className="px-5 py-3 sm:px-6">Institution</th><th scope="col" className="institution-count-column px-5 py-3 text-right sm:px-6">Responses</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleGroups.map((group, index) => (
                <Fragment key={group.key}>
                  <tr className={`institution-group-row cursor-pointer ${expanded === group.key ? "is-expanded" : ""}`} onClick={() => setExpanded(expanded === group.key ? null : group.key)}>
                    <td className="px-5 py-4 font-semibold text-slate-900 sm:px-6">
                      <button type="button" aria-expanded={expanded === group.key} aria-controls={`institution-responses-${index}`} onClick={event => { event.stopPropagation(); setExpanded(expanded === group.key ? null : group.key); }} className="institution-toggle flex w-full items-center gap-3 text-left sm:gap-4">
                        <span className="institution-symbol hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex"><Building2 size={19} /></span>
                        <span className="min-w-0 flex-1 leading-relaxed">
                          <span className="block">{group.name}</span>
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {[...new Set(group.rows.map(row => String(row["SUC/LUC"] || "").trim()).filter(Boolean))].map(type => <span key={type} className="institution-type-badge">{type}</span>)}
                            {[...new Set(group.rows.map(row => String(row.Region || "").trim()).filter(Boolean))].map(item => <span key={item} className="institution-region-badge">{item}</span>)}
                          </span>
                        </span>
                        <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${expanded === group.key ? "rotate-180 text-blue-600" : ""}`} />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right sm:px-6"><span className="institution-response-count">{group.rows.length}<span className="hidden text-xs font-medium sm:inline">{group.rows.length === 1 ? "response" : "responses"}</span></span></td>
                  </tr>
                  <tr id={`institution-responses-${index}`} hidden={expanded !== group.key}>
                    <td colSpan={2} className="bg-slate-50 p-3 sm:p-5">
                      {expanded === group.key && <CampusDirectory rows={group.rows} onSelect={setSelected} />}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleGroups.length && !loading && !isFilterLoading && !error && <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
          <span className="rounded-2xl bg-blue-50 p-4 text-blue-600"><Search size={25} aria-hidden="true" /></span>
          <h3 className="font-semibold text-slate-800">No institutions found</h3>
          <p className="max-w-sm text-sm text-slate-500">{hasFilters ? "Try a different institution name, type, or region." : "Institution responses will appear here when available."}</p>
          {hasFilters && <button type="button" onClick={resetFilters} className="institution-reset rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Clear filters</button>}
        </div>}
        {total > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-slate-500">Showing <span className="font-semibold text-slate-700">{firstRow}–{lastRow}</span> of {institutionCount.toLocaleString()} institutions</div>
          <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">Institutions per page<select value={pageSize} onChange={event => changePageSize(Number(event.target.value))} disabled={isPageLoading} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><div className="flex items-center gap-1"><button type="button" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={isPageLoading || currentPage === 1} aria-label="Previous page" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-20 text-center text-xs font-medium text-slate-600" aria-live="polite">{isPageLoading ? `Loading ${page}…` : `Page ${currentPage} of ${pageCount}`}</span><button type="button" onClick={() => changePage(Math.min(pageCount, currentPage + 1))} disabled={isPageLoading || currentPage === pageCount} aria-label="Next page" aria-busy={isPageLoading} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">{isPageLoading ? <LoaderCircle size={16} className="animate-spin" /> : <ChevronRight size={16} />}</button></div></div>
        </div>}
      </div>

      {selected && <DetailsModal row={selected} headers={headers} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CampusDirectory({ rows, onSelect }) {
  const campuses = groupCampuses(rows);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">{campuses.length} {campuses.length === 1 ? "campus" : "campuses"}</p>
      {campuses.map(campus => (
        <details key={campus.key} className="group/campus overflow-hidden rounded-xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-semibold text-slate-900 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
            <Building2 size={18} className="shrink-0 text-blue-600" />
            <span className="min-w-0 flex-1 break-words">{campus.name}</span>
            <span className="shrink-0 text-xs font-medium text-slate-500">{campus.rows.length} {campus.rows.length === 1 ? "response" : "responses"}</span>
            <ChevronDown size={17} className="shrink-0 text-slate-400 transition-transform group-open/campus:rotate-180" />
          </summary>
          <div className="divide-y divide-slate-100 border-t border-slate-200">
            {campus.rows.map((row, index) => (
              <div key={row.rowNumber ?? index} className="px-4 py-3 hover:bg-slate-50">
                <button type="button" onClick={() => onSelect(row)} aria-label={`View response ${index + 1} from ${campus.name}`} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"><Eye size={17} />View response{campus.rows.length > 1 ? ` ${index + 1}` : ""}</button>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function DetailsModal({ row, headers, onClose }) {
  const fieldValue = name => {
    const key = Object.keys(row).find(key => key.trim().toLowerCase() === name.toLowerCase());
    return key == null ? "" : String(row[key] ?? "").trim();
  };
  const institutionName = fieldValue("Name of Institution") || fieldValue("Institution") || "SURVEY RESPONSES";
  const institutionType = fieldValue("SUC/LUC");
  const institutionTypeLabel = {
    SUC: "State Universities and Colleges",
    LUC: "Local Universities and Colleges",
  }[institutionType.toUpperCase()] || institutionType;
  const campus = fieldValue("Name of Institution Campus") || fieldValue("Campus") || "—";
  const address = fieldValue("Address of Campus") || "—";
  const region = fieldValue("Region") || "—";
  const timestamp = fieldValue("Timestamp") || "—";
  const summaryFields = ["suc/luc", "institution", "campus", "name of institution", "name of institution campus", "address of campus", "region", "timestamp"];
  const responseHeaders = headers.filter(header => !summaryFields.includes(header.trim().toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-blue-200/20 bg-white shadow-[0_28px_80px_rgba(2,6,23,0.45)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="relative flex shrink-0 flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-[#0b1f3a] via-[#0e294d] to-[#123c6d] px-5 py-5 text-white sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center sm:flex justify-center rounded-xl border border-white/15 bg-white/10 text-blue-100 shadow-inner shadow-white/10">
              <Building2 size={20} />
            </div>
            <div className="min-w-0 pr-12 lg:pr-0">
              {institutionTypeLabel && <p className="mb-1 text-sm font-medium text-blue-100">{institutionTypeLabel}</p>}
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{institutionName}</h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="pr-12 text-xs text-blue-100 lg:pr-0 lg:text-right">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-200">Submitted</p>
              <p className="tabular-nums">{timestamp}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-7 lg:static"
              aria-label="Close institution details"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-slate-100/90 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-5">
            <section className="rounded-2xl border border-blue-100 border-l-4 border-l-blue-600 bg-white p-5 shadow-sm sm:p-6">
              <p className="whitespace-pre-wrap break-words text-lg font-semibold text-slate-900">{campus}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{address}</p>
              <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{region}</p>
            </section>
            <section aria-label="Survey responses" className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h3 className="text-sm font-semibold text-slate-800 uppercase">Survey responses</h3>
                <span className="text-xs text-slate-500">{responseHeaders.length} fields</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {responseHeaders.map((header, index) => {
                  const value = row[header];
                  const displayValue = value === "" || value == null ? "—" : String(value);

                  return (
                    <div
                      key={header}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <span aria-hidden="true" className="flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-[10px] font-semibold tabular-nums text-slate-500">{String(index + 1).padStart(2, "0")}</span>
                        <p className="pt-0.5 text-sm font-semibold leading-5 text-slate-600">{header}</p>
                      </div>
                      <div className="ml-9 mt-3 whitespace-pre-wrap break-words border-l-2 border-blue-100 pl-3 text-[15px] font-medium italic leading-7 text-slate-900">
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
