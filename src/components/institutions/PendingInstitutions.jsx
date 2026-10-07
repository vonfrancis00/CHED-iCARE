import { useEffect, useRef, useState } from "react";
import { Bell, RefreshCw, X } from "lucide-react";
import { accountFetch } from "../../services/accountApi";
import { invalidateSheetData } from "../../services/api";

const fields = [["institutionType", "SUC/LUC"], ["region", "Region"], ["institution", "Institution"], ["campus", "Campus"]];
const references = ["Name of Institution", "Name of Institution Campus", "Address of Campus"];

export default function PendingInstitutions() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const button = useRef(null);
  const dialog = useRef(null);
  const reading = useRef(false);

  async function refresh(signal) {
    if (reading.current) return;
    reading.current = true;
    setLoading(true);
    try {
      const response = await accountFetch("/api/sheet?action=getPendingInstitutions", { signal });
      const payload = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) throw new Error(payload.message || "Unable to load pending responses.");
      setRows(payload.data); setError("");
    } catch (failure) { if (!signal?.aborted) setError(failure.message); }
    finally { reading.current = false; if (!signal?.aborted) setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const timer = setInterval(() => { if (!document.hidden) refresh(controller.signal); }, 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape" && !saving) { setOpen(false); setSelected(null); }
      if (event.key !== "Tab") return;
      const items = [...dialog.current.querySelectorAll('button:not(:disabled), input, select')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", keydown); button.current?.focus(); };
  }, [open, saving, selected]);

  function select(row) {
    setSelected(row); setError(""); setMessage("");
    setValues(Object.fromEntries(fields.map(([key, label]) => [key, /^unnamed institution$/i.test(row[label]) ? "" : row[label] || ""])));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await accountFetch("/api/sheet?action=completeInstitution", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, rowNumber: selected.rowNumber, identity: selected.identity })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "The save could not be confirmed. Refresh notifications before retrying.");
      setRows(current => current.filter(row => row.rowNumber !== selected.rowNumber));
      setSelected(null); setMessage("Saved. The institution is now available in the directory.");
      invalidateSheetData();
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }

  return <>
    <button ref={button} type="button" onClick={() => { setOpen(true); refresh(); }} aria-label={`Notifications: ${rows.length} pending responses${error ? ", unable to refresh" : ""}`} className="fixed bottom-6 right-6 z-40 rounded-full bg-[#08264d] p-4 text-white shadow-xl hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
      <Bell size={24} />
      {(rows.length > 0 || error) && <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold">{rows.length || "!"}</span>}
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) { setOpen(false); setSelected(null); } }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pending-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><h2 id="pending-title" className="text-xl font-bold text-[#08264d]">{selected ? "Complete institution details" : "New responses"}</h2><p className="mt-1 text-sm text-slate-500">{selected ? "Complete all four fields to add this response to the directory." : `${rows.length} responses awaiting institution details`}</p></div><button type="button" disabled={saving} onClick={() => { setOpen(false); setSelected(null); }} aria-label="Close notifications" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        {selected ? <form onSubmit={save} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="text-sm font-semibold text-slate-700">{label} <span className="text-red-600">*</span>{key === "institutionType" ? <select required disabled={saving} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} className="mt-2 block w-full rounded-lg border border-slate-300 p-2.5"><option value="">Select type</option><option>SUC</option><option>LUC</option></select> : <input required maxLength={500} disabled={saving} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} className="mt-2 block w-full rounded-lg border border-slate-300 p-2.5" />}</label>)}</div>
          <div className="rounded-xl bg-slate-50 p-4"><h3 className="mb-4 font-semibold text-slate-800">Submitted answers</h3><dl className="space-y-4">{references.map(label => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{selected[label] || "No answer provided"}</dd></div>)}</dl></div>
          <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2.5 text-sm">Back</button><button type="submit" disabled={saving || fields.some(([key]) => !values[key]?.trim())} className="rounded-lg bg-[#08264d] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button></div>
        </form> : <><button type="button" onClick={() => refresh()} disabled={loading} className="my-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Refreshing..." : "Refresh responses"}</button><div className="space-y-3">{rows.map(row => <button key={row.rowNumber} type="button" onClick={() => select(row)} className="block w-full rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50"><span className="block font-semibold text-slate-900">{row["Name of Institution"] || "Unnamed institution"}</span><span className="mt-1 block text-sm text-slate-600">{row["Name of Institution Campus"] || "Campus not provided"}</span><span className="mt-2 block text-xs text-slate-500">{row.Timestamp || `Response ${row.rowNumber}`}</span></button>)}{!rows.length && !loading && !error && <p className="py-8 text-center text-sm text-slate-500">No responses awaiting institution details.</p>}</div></>}
      </section>
    </div>}
  </>;
}
