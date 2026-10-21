import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Bell, Building2, CheckCircle2, ClipboardList, RefreshCw, X } from "lucide-react";
import { accountFetch } from "../../services/accountApi";
import { invalidateSheetData } from "../../services/api";

const fields = [["institutionType", "SUC/LUC"], ["region", "Region"], ["institution", "Institution"], ["campus", "Campus"]];
const defaultRegions = ["NCR", "CAR", ...Array.from({ length: 13 }, (_, i) => `Region ${i + 1}`), "MIMAROPA", "NIR", "BARMM"];
const references = ["Name of Institution", "Name of Institution Campus", "Address of Campus"];

export default function PendingInstitutions() {
  const [sucOptions, setSucOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [lockLost, setLockLost] = useState(false);
  const reservation = useRef(null);
  const button = useRef(null);
  const dialog = useRef(null);
  const reading = useRef(null);

  async function refresh(signal) {
    if (reading.current) return;
    const request = {};
    reading.current = request;
    setLoading(true);
    try {
      const response = await accountFetch("/api/sheet?action=getPendingInstitutions", { signal });
      const payload = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) throw new Error(payload.message || "Unable to load pending responses.");
      if (!signal?.aborted && reading.current === request) { setRows(payload.data); setSucOptions(payload.sucOptions || []); setError(""); }
    } catch (failure) { if (!signal?.aborted && reading.current === request) setError(failure.message); }
    finally {
      if (reading.current === request) {
        reading.current = null;
        if (!signal?.aborted) setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const check = () => { if (!document.hidden) refresh(controller.signal); };
    check();
    const timer = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      controller.abort();
      reading.current = null;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape" && !saving) { releaseReservation(); setOpen(false); setSelected(null); }
      if (event.key !== "Tab") return;
      const items = [...dialog.current.querySelectorAll('button:not(:disabled), input, select')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", keydown); button.current?.focus(); };
  }, [open, saving, selected]);

  async function lockRequest(action, entry) {
    const response = await accountFetch(`/api/sheet?action=${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to reserve this response.");
    return payload;
  }

  function releaseReservation() {
    const entry = reservation.current;
    reservation.current = null;
    if (entry) lockRequest("releaseInstitutionLock", entry).catch(() => {});
  }

  useEffect(() => {
    if (!selected) return;
    const entry = reservation.current;
    let active = true;
    let renewing = false;
    const renew = async () => {
      if (renewing || !active) return;
      renewing = true;
      try { await lockRequest("renewInstitutionLock", entry); }
      catch (failure) { if (active) { setLockLost(true); setError(failure.message); } }
      finally { renewing = false; }
    };
    const timer = setInterval(renew, 45000);
    window.addEventListener("online", renew);
    return () => { active = false; clearInterval(timer); window.removeEventListener("online", renew); };
  }, [selected]);

  useEffect(() => () => releaseReservation(), []);

  async function select(row) {
    if (claiming) return;
    setClaiming(true); setError(""); setMessage("");
    const entry = { rowNumber: row.rowNumber, identity: row.identity, lockToken: crypto.randomUUID() };
    reservation.current = entry;
    try {
      await lockRequest("claimInstitution", entry);
      if (reservation.current !== entry) {
        lockRequest("releaseInstitutionLock", entry).catch(() => {});
        return;
      }
      setLockLost(false); setSelected(row);
      setValues(Object.fromEntries(fields.map(([key, label]) => [key, /^unnamed institution$/i.test(row[label]) ? "" : row[label] || ""])));
    } catch (failure) {
      if (reservation.current === entry) { releaseReservation(); setError(failure.message); refresh(); }
    } finally { setClaiming(false); }
  }

  async function save(event) {
    event.preventDefault();
    if (saving || lockLost || !reservation.current) return;
    setSaving(true); setError("");
    try {
      const response = await accountFetch("/api/sheet?action=completeInstitution", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, ...reservation.current })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "The save could not be confirmed. Refresh notifications before retrying.");
      setRows(current => current.filter(row => row.rowNumber !== selected.rowNumber));
      reservation.current = null;
      setSelected(null); setMessage("Saved. The institution is now available in the directory.");
      invalidateSheetData();
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }

  return <>
    <button ref={button} type="button" 
    onClick={() => { setOpen(true); refresh(); }} 
    aria-label={`Notifications: ${rows.length} pending responses${error ? ", unable to refresh" : ""}`} 
    className="fixed bottom-[108px] right-6 z-40 rounded-full bg-[#08264d] p-4 text-white shadow-xl hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
      <Bell size={24} />
      {(rows.length > 0 || error) && <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold">{rows.length || "!"}</span>}
    </button>
    {open && <div className="pending-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" 
    onMouseDown={event => { if (event.target === event.currentTarget && !saving) { releaseReservation(); setOpen(false); setSelected(null); } }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pending-title" aria-describedby="pending-description" className="pending-modal flex w-full max-w-2xl flex-col overflow-hidden">
        <header className="pending-modal-header flex shrink-0 items-start justify-between gap-4 p-5 sm:p-7">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200">
              <ClipboardList size={14} />Institution directory
            </span>
          <h2 id="pending-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {selected ? "Complete Institution Details" : "New Responses"}
          </h2>
          <p id="pending-description" className="mt-2 max-w-md text-sm leading-6 text-blue-100">
            {selected ? "Complete all four fields to add this response to the directory." : "Review survey submissions and complete their institution details."}
          </p>
          </div>
          <button type="button" disabled={saving} 
          onClick={() => { releaseReservation(); setOpen(false); setSelected(null); }} aria-label="Close notifications"
          className="pending-modal-close grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-blue-100 transition hover:bg-white/20 hover:text-white disabled:opacity-50">
            <X size={20} />
          </button>
        </header>
        <div className="pending-modal-body min-h-0 overflow-y-auto p-5 sm:p-7">
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {selected ? <form onSubmit={save} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter(([key]) => key !== "institution" || values.institutionType !== "SUC").map(([key, label]) =>
              <label key={key} className="text-sm font-semibold text-slate-700">
                {label} <span className="text-red-600">*</span>
                {key === "institutionType" || key === "region" ? <select required disabled={saving} value={values[key] || ""}
                  onChange={event => setValues(current => ({ ...current, [key]: event.target.value, ...(key === "institutionType" || current.institutionType === "SUC" ? { institution: "" } : {}) }))}
                  className="mt-2 block w-full rounded-lg border border-slate-300 p-2.5">
                  <option value="">{key === "region" ? "Select Region" : "Select Type"}</option>
                  {(key === "institutionType" ? ["SUC", "LUC"] : [...new Set([...defaultRegions, ...sucOptions.map(item => item.region), values.region].filter(Boolean))]).map(option => <option key={option}>{option}</option>)}
                </select> : <input required maxLength={500} disabled={saving} value={values[key] || ""}
                  onChange={event => setValues({ ...values, [key]: event.target.value })}
                  className="mt-2 block w-full rounded-lg border border-slate-300 p-2.5" />}
              </label>)}
            {values.institutionType === "SUC" && <fieldset className="sm:col-span-2">
              <legend className="text-sm font-semibold text-slate-700">SUC <span className="text-red-600">*</span></legend>
              <p className="mt-1 text-xs text-slate-500">Select one institution. Saving also checks its Survey box in Per OCC.</p>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-3">
                {[...new Map(sucOptions.filter(item => !values.region || item.region === values.region).map(item => [JSON.stringify([item.region, item.name]), item])).values()].map(item =>
                  <label key={JSON.stringify([item.region, item.name])} className="flex items-start gap-3 rounded p-2 text-sm hover:bg-blue-50">
                    <input type="checkbox" disabled={saving} checked={values.institution === item.name && values.region === item.region}
                      onChange={event => setValues(current => ({ ...current, institution: event.target.checked ? item.name : "", region: item.region }))} className="mt-1" />
                    <span>{item.name}<small className="block text-slate-500">{item.region}</small></span>
                  </label>)}
                {!sucOptions.some(item => !values.region || item.region === values.region) && <p className="text-sm text-slate-500">No SUCs available for this region. Refresh responses to load the current Per OCC list.</p>}
              </div>
            </fieldset>}
          </div>
          <div className="rounded-2xl border border-blue-100 bg-slate-50 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#08264d]">
              <ClipboardList size={17} className="text-blue-700" />
              Submitted Answers
              </h3>
              <dl className="space-y-4">
                {references.map(label => <div key={label}>
                  <dt className="text-xs font-semibold text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">
                    {selected[label] || "No answer provided"}
                  </dd>
                  </div>
                )}
                </dl>
                </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" disabled={saving} 
            onClick={() => { releaseReservation(); setSelected(null); }} className="pending-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to responses
            </button>
            <button type="submit" disabled={saving || lockLost || fields.some(([key]) => !values[key]?.trim())}
            className="pending-primary inline-flex items-center justify-center gap-2">
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? "Saving..." : "Save institution"}
            </button>
            </div>
        </form> : 
        <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-bold tabular-nums text-blue-800">
              {rows.length}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Awaiting Details
                </span>
                </div>
                <button type="button" onClick={() => refresh()} disabled={loading} className="pending-secondary inline-flex items-center gap-2">
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Refreshing..." : "Refresh Responses"}
                </button>
        </div>
                  <div className="space-y-3" aria-busy={loading}>
                    {rows.map(row => <button key={row.rowNumber} type="button" disabled={claiming || Boolean(row.editing)} onClick={() => select(row)} className="pending-response flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left sm:gap-4 sm:p-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                        <Building2 size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-[#08264d]">{row["Name of Institution"] || "Unnamed institution"}
                          </span>
                          <span className="mt-1 block break-words text-sm text-slate-500">{row["Name of Institution Campus"] || "Campus not provided"}
                          </span>
                          <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              {row.editing ? `Being edited by ${row.editing.name}` : claiming ? "Reserving response..." : "Details Needed"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {row.Timestamp || `Response ${row.rowNumber}`}
                            </span>
                            </span>
                            </span>
                            <ArrowUpRight size={18} className="mt-1 shrink-0 text-blue-600" />
                            </button>
                          )}{!rows.length && loading && <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                            <RefreshCw size={18} className="animate-spin" />
                            Loading Responses...</div>
                            }{!rows.length && !loading && !error && <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-5 py-10 text-center">
                              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700">
                                <CheckCircle2 size={24} />
                                </span>
                                <h3 className="mt-4 text-base font-semibold text-[#08264d]">
                                  You're all caught up
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                  No responses awaiting institution details.</p></div>}</div></>}
        </div>
      </section>
    </div>}
  </>;
}
