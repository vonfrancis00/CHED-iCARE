import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowDownUp, ArrowRight, ArrowUpRight, Building2, CheckCircle2, CircleDashed, ClipboardList, Clock3, RefreshCw, Search, X } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import Loading from "../components/common/Loading";
import OCCSheetView from "../components/dashboard/OCCSheetView";

const number = value => (Number(value) || 0).toLocaleString();
const percent = (checked, total) => total ? Math.min(100, Math.max(0, Math.round(checked / total * 100))) : 0;

const officeStatus = office => {
  const assigned = Number(office.value) || 0, responded = Number(office.responded) || 0;
  return assigned <= 0 ? "unassigned" : responded >= assigned ? "complete" : responded > 0 ? "progress" : "waiting";
};
const statusLabels = { all: "All Offices", complete: "Completed", progress: "In Progress", waiting: "Awaiting responses", unassigned: "No assignments" };
const statusTones = { complete: "bg-emerald-50 text-emerald-700", progress: "bg-blue-50 text-blue-700", waiting: "bg-amber-50 text-amber-700", unassigned: "bg-slate-100 text-slate-600" };
const formatDate = date => date.toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const normalizeOffice = value => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
const completedDate = office => {
  if (!office || officeStatus(office) !== "complete" || !office.completedAt) return null;
  const date = new Date(office.completedAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

function OfficeRegisterModal({ office, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog ref={dialogRef} id="occ-institution-register" aria-label={`${office.name} institution register`}
      onCancel={onClose} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-7xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <p className="text-sm font-semibold text-blue-700">Office institution register</p>
        <button type="button" autoFocus onClick={onClose} aria-label="Close office register" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><X size={20} /></button>
      </div>
      <OCCSheetView key={office.name} offices={[office]} selectedOfficeName={office.name} isOpen />
    </dialog>, document.body
  );
}
export default function OCC({ user }) {
  const [selectedOfficeName, setSelectedOfficeName] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("progress");
  const [status, setStatus] = useState("all");
  const { data, loading, refreshing, error, reload } = useDashboard();
  if (loading && !data) return <Loading label="Loading office monitoring..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold">Unable to load OCC / Office data</h2><p className="mt-2 text-sm text-slate-500">{error || "No data received."}</p><button onClick={() => reload({ force: true })} className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;
  const allOffices = (data.occOffices?.length ? data.occOffices : data.occDistribution || [])
    .filter(office => String(office.name || "").toLowerCase().includes("office"));
  const isSuperAdmin = user?.role === "super_admin";
  const assignedOffice = normalizeOffice(user?.office);
  const offices = isSuperAdmin ? allOffices : allOffices.filter(office => normalizeOffice(office.name) === assignedOffice);
  const total = offices.reduce((sum, office) => sum + (Number(office.value) || 0), 0);
  const accomplished = offices.reduce((sum, office) => sum + (Number(office.responded) || 0), 0);
  const pending = Math.max(0, total - accomplished);
  const rate = percent(accomplished, total);
  const visible = offices.filter(office => String(office.name || "").toLowerCase().includes(query.trim().toLowerCase()) && (status === "all" || officeStatus(office) === status)).sort((a, b) => {
    const aAssigned = Number(a.value) || 0;
    const bAssigned = Number(b.value) || 0;
    const byName = a.name.localeCompare(b.name);
    if (sort === "name") return byName;
    if (sort === "pending") return (bAssigned - (Number(b.responded) || 0)) - (aAssigned - (Number(a.responded) || 0)) || byName;
    if (sort === "assigned") return bAssigned - aAssigned || byName;
    return percent(Number(b.responded) || 0, bAssigned) - percent(Number(a.responded) || 0, aAssigned) || byName;
  });
  const selected = isSuperAdmin
    ? offices.find(office => office.name === selectedOfficeName)
    : offices[0];
  const refresh = () => reload({ force: true });
  const openOffice = name => {
    setSelectedOfficeName(name);
  };
  const completedOffices = offices.filter(office => officeStatus(office) === "complete").length;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
        <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full border-[55px] border-blue-400/10" />
        <div className={`relative grid gap-8 p-6 sm:p-8 ${isSuperAdmin ? "lg:grid-cols-[1fr_300px] lg:items-center" : ""}`}>
          <div>
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100"><Building2 size={15} /> Office oversight</div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl uppercase">OCC / Offices</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">{isSuperAdmin ? "Overview of institutional assignments, survey completion, and monitoring progress across Chairperson and Commissioners offices." : "Your office's institutional assignments, survey completion, and monitoring progress."}</p>
            <p className="mt-4 text-xs text-blue-200">{isSuperAdmin ? `${completedOffices} of ${offices.length} offices completed` : "Monitoring your assigned office"}{data.source === "demo" ? " ? Demo data" : ""}</p>
            <button type="button" onClick={refresh} disabled={refreshing} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing…" : "Refresh data"}</button>
          </div>
          {isSuperAdmin && <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-medium text-blue-100"><span>Overall Survey Progress</span><CheckCircle2 size={16} className="text-blue-200" /></div>
            <div className="mt-3 flex items-baseline gap-2"><span className="text-5xl font-semibold tracking-tight tabular-nums">{rate}<span className="text-2xl text-blue-200">%</span></span><span className="text-xs text-blue-100">Accomplished</span></div>
            <div role="progressbar" aria-label="Overall survey progress" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} className="my-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-400 transition-all" style={{ width: `${rate}%` }} /></div>
            <p className="text-xs text-blue-100">{number(accomplished)} of {number(total)} assigned institutions accomplished</p>
          </div>}
        </div>
      </section>
      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing saved data. Refresh failed: {error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assigned Institutions", value: total, detail: isSuperAdmin ? "Across your office register" : "Assigned to your office", icon: ClipboardList, tone: "bg-blue-100 text-blue-700" },
          { label: isSuperAdmin ? "Offices Monitored" : "Survey progress", value: isSuperAdmin ? offices.length : rate, detail: isSuperAdmin ? `${completedOffices} fully completed` : "Completion of assigned surveys", icon: Building2, tone: "bg-indigo-100 text-indigo-700" },
          { label: "Accomplished Institutions", value: accomplished, detail: "Completed Institution Submissions", icon: CheckCircle2, tone: "bg-sky-100 text-sky-700" },
          { label: "Pending Institutions", value: pending, detail: "Remaining Institutions", icon: CircleDashed, tone: "bg-slate-100 text-slate-700" },
        ].map(({ label, value, detail, icon: Icon, tone }) =>
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              {label}
            </span>
            <span className={`rounded-xl p-2 ${tone}`}>
              <Icon size={17} />
            </span>
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
            {label === "Survey progress" ? `${value}%` : number(value)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {detail}
          </p>
          </div>)}
      </div>
      {isSuperAdmin && <section className="space-y-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Office Overview
              <span className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-0.5 align-middle text-xs text-slate-500">
                {offices.length}
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search or filter offices, then select one to open its institution register.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input type="search" aria-label="Search offices"
              value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Search offices…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-56" />
            </div>
            <div className="relative">
              <ArrowDownUp size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
              <select aria-label="Sort offices" value={sort} onChange={event => setSort(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-6 text-sm text-slate-600 focus:outline-blue-600">
                <option value="progress">
                  Highest Survey Progress
                </option>
                <option value="assigned">
                  Most Assigned
                </option>
                <option value="pending">
                  Most Pending
                </option>
                <option value="name">
                  Office Name
                </option>
                </select>
              </div>
            </div>
          </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter offices by completion status">{Object.entries(statusLabels).filter(([value]) => value !== "waiting" && value !== "unassigned").map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`rounded-full border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${status === value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{label} <span className={status === value ? "ml-1 text-blue-100" : "ml-1 text-slate-400"}>{value === "all" ? offices.length : offices.filter(office => officeStatus(office) === value).length}</span></button>)}</div>
        <p className="text-xs text-slate-500" aria-live="polite">Showing {visible.length} of {offices.length} offices</p>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map(office => {
            const value = Number(office.value) || 0;
            const responded = Number(office.responded) || 0;
            const progress = percent(responded, value);
            const completedAt = completedDate(office);
            const active = selectedOfficeName === office.name;
            return <button key={office.name} type="button" aria-haspopup="dialog" aria-controls="occ-institution-register"
            onClick={() => openOffice(office.name)}
            className={`group overflow-hidden rounded-2xl border bg-white text-left transition duration-200 hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200"}`}>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className={`rounded-xl p-2.5 ${active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                    <Building2 size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-6 text-slate-900">
                        {office.name}
                      </h3>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTones[officeStatus(office)]}`}>{statusLabels[officeStatus(office)]}</span>
                      <p className="mt-2 text-xs text-slate-500">
                        {number(value)} assigned institutions
                      </p>
                    </div>
                    <ArrowRight size={17} className={`mt-2 shrink-0 ${active ? "text-blue-700" : "text-slate-300 group-hover:text-blue-700"}`} />
                    </div>
                    <div className="mb-2 mt-6 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Survey Progress
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {progress}%
                      </span>
                    </div>
                    <div role="progressbar" aria-label={`${office.name} survey progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${progress}%` }}/>
                      </div>
                    </div>
                    <div className={`flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-xs ${active ? "border-blue-100 bg-blue-50" : "border-slate-100 bg-slate-50/70"}`}>
                    <span className="inline-flex items-center gap-1.5 font-medium text-blue-700">
                      <CheckCircle2 size={14} />
                      {number(responded)} accomplished
                    </span>
                    {completedAt ? <time dateTime={office.completedAt} className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                      <Clock3 size={14} />Completed {formatDate(completedAt) + " (PHT)"}</time> : <span className="text-slate-500">{number(Math.max(0, value - responded))} pending</span>}
                    </div>
                    </button>;
          })}
        </div>
        {!visible.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{query || status !== "all" ? "No offices match these filters." : "No office assignments are available yet."}{(query || status !== "all") && <button type="button" onClick={() => { setQuery(""); setStatus("all"); }} className="mx-auto mt-4 block rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-700">Clear filters</button>}</div>}
      </section>}

      {!isSuperAdmin && selected && <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">Your office</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{selected.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Your institution register is shown below.</p>
          </div>
        </div>
        {completedDate(selected) && <div className="flex items-center gap-1.5 border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-xs font-medium text-emerald-700 sm:px-6"><Clock3 size={14} /><time dateTime={selected.completedAt}>Completed {formatDate(completedDate(selected)) + " (PHT)"}</time></div>}
      </section>}
      {isSuperAdmin && selected && <OfficeRegisterModal office={selected} onClose={() => setSelectedOfficeName("")} />}
      {!isSuperAdmin && <div id="occ-institution-register" className="scroll-mt-6">
        {selected ? <OCCSheetView key={selected.name} offices={[selected]} selectedOfficeName={selected.name} isOpen /> :
        <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
          <Building2 size={24} className="shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isSuperAdmin ? "Explore an office" : "No office assignment found"}
              </p>
              <p className="mt-1 text-xs">
                {isSuperAdmin ? "Choose an office above to view institutions and their survey status." : "Ask a super admin to assign your account to an OCC / Office."}
              </p>
          </div>
        </div>
        }
      </div>}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div><h2 className="text-sm font-semibold text-[#08264d]">Share Office Monitoring Progress</h2><p className="mt-1 text-xs leading-5 text-slate-500">Prepare an office report with institution assignments and survey status.</p></div><Link to="/reports" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Open Reports<ArrowUpRight size={16} /></Link></section>
    </div>
  );
}
