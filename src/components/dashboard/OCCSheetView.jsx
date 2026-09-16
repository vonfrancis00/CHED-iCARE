import { useState } from "react";
import { Building2, CheckCircle2, CircleDashed, Search } from "lucide-react";

export default function OCCSheetView({ offices = [], selectedOfficeName = "", isOpen = false }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  if (!isOpen) return null;
  const office = offices[0];
  const institutions = (office?.institutions || []).map((item, index) => ({ ...(typeof item === "string" ? { name: item, responded: null } : item), row: index + 1 }));
  const checked = institutions.filter(item => item.responded === true).length;
  const pending = institutions.filter(item => item.responded === false).length;
  const unknown = institutions.length - checked - pending;
  const visible = institutions.filter(item => `${item.name || ""} ${item.region || ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || (status === "checked" ? item.responded === true : status === "pending" ? item.responded === false : item.responded !== true && item.responded !== false)));
  if (!office) return <section className="card p-10 text-center text-sm text-slate-500">No institution records available.</section>;
  return (
    <section aria-label={`${selectedOfficeName} institution register`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-teal-50 p-3 text-teal-700"><Building2 size={23} /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">Institution register</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{selectedOfficeName}</h2></div></div>
        <div className="flex flex-wrap gap-2 text-xs font-medium"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{institutions.length} records</span><span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-700">{checked} checked</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{pending} pending</span>{unknown > 0 && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">{unknown} unknown</span>}</div>
      </div>
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-6 xl:flex-row xl:items-center">
        <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input type="search" aria-label="Search institutions or regions" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search institutions or regions…" className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:min-w-80" /></div>
        <div role="group" aria-label="Filter by survey status" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">{[["all", "All records"], ["checked", "Checked"], ["pending", "Pending"], ...(unknown ? [["unknown", "Unknown"]] : [])].map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`rounded-md px-3 py-2 text-xs font-medium transition focus-visible:outline-teal-600 ${status === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>)}</div>
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Institutions and survey status for {selectedOfficeName}</caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th scope="col" className="w-16 px-6 py-3.5 font-semibold">No.</th><th scope="col" className="px-4 py-3.5 font-semibold">Institution</th><th scope="col" className="px-4 py-3.5 font-semibold">Region</th><th scope="col" className="px-6 py-3.5 font-semibold">Survey status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{visible.map(item => <tr key={item.row} className="transition hover:bg-slate-50"><td className="px-6 py-4 text-xs tabular-nums text-slate-400">{String(item.row).padStart(2, "0")}</td><th scope="row" className="px-4 py-4 font-medium leading-6 text-slate-800">{item.name || "Unnamed institution"}</th><td className="whitespace-nowrap px-4 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.region || "Not specified"}</span></td><td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.responded === true ? "bg-teal-50 text-teal-700" : item.responded === false ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{item.responded === true ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}{item.responded === true ? "Checked" : item.responded === false ? "Pending" : "Unknown"}</span></td></tr>)}</tbody>
        </table>
        {!visible.length && <div className="px-6 py-12 text-center"><Search size={24} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-medium text-slate-700">{institutions.length ? "No matching institutions" : "No institution records available"}</p><p className="mt-1 text-xs text-slate-500">{institutions.length ? "Try a different search or survey status." : "Institution details will appear here when available."}</p>{institutions.length > 0 && <button onClick={() => { setQuery(""); setStatus("all"); }} className="mt-4 text-xs font-semibold text-teal-700 underline underline-offset-4">Clear filters</button>}</div>}
      </div>
      <div aria-live="polite" className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500"><span>Showing {visible.length} of {institutions.length} institutions</span><span>Survey checks · Office assignments</span></div>
    </section>
  );
}
