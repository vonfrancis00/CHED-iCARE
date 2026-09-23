import { useState } from "react";
import { Building2, CheckCircle2, CircleDashed, Download, Printer, Search, X } from "lucide-react";
import { useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function OCCSheetView({ offices = [], selectedOfficeName = "", isOpen = false }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [creatingPdf, setCreatingPdf] = useState(false);
  const headerRef = useRef(null);
  if (!isOpen) return null;
  const office = offices[0];
  const institutions = (office?.institutions || []).map((item, index) => ({ ...(typeof item === "string" ? { name: item, responded: null } : item), row: index + 1 }));
  const checked = institutions.filter(item => item.responded === true).length;
  const pending = institutions.filter(item => item.responded === false).length;
  const unknown = institutions.length - checked - pending;
  const visible = institutions.filter(item => `${item.name || ""} ${item.region || ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || (status === "checked" ? item.responded === true : status === "pending" ? item.responded === false : item.responded !== true && item.responded !== false)));
  const statusLabel = { all: "All records", checked: "Accomplished", pending: "Pending", unknown: "Unknown" }[status];
  const openPdf = async (openInNewTab = true) => {
    const pdfWindow = openInNewTab ? window.open("", "_blank") : null;
    setCreatingPdf(true);
    try {
      const header = headerRef.current;
      if (!header?.complete) await new Promise((resolve, reject) => { header.onload = resolve; header.onerror = reject; });
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = Math.round(canvas.width * header.naturalHeight / header.naturalWidth);
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(header, 0, 0, canvas.width, canvas.height);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const safeOfficeName = selectedOfficeName.replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, " ").trim() || "Office";
      const fileName = `OCC / Office List - ${safeOfficeName}.pdf`;
      pdf.setProperties({ title: fileName.replace(/\.pdf$/i, ""), subject: "OCC / Office institution register", author: "CHED iCARE Monitoring System" });
      const addHeader = () => { pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 20, 14, 170, 26.64, undefined, "FAST"); pdf.setDrawColor(30, 41, 59); pdf.setLineWidth(0.35); pdf.line(20, 43, 190, 43); };
      addHeader();
      pdf.setFont("times", "bold"); pdf.setFontSize(13); pdf.text("INSTITUTION REGISTER", 105, 50, { align: "center" });
      pdf.setFontSize(11); pdf.text(selectedOfficeName, 105, 56, { align: "center", maxWidth: 166 });
      pdf.setFont("times", "normal"); pdf.setFontSize(8.5); pdf.text(`Survey status: ${statusLabel} · ${visible.length} record${visible.length === 1 ? "" : "s"}${query ? ` · Search: ${query}` : ""}`, 105, 61.5, { align: "center" });
      autoTable(pdf, { startY: 66, margin: { left: 20, right: 20, top: 50, bottom: 16 }, 
        head: [["Institution", "Region", "Survey status"]], 
        body: visible.map(item => [item.name || "Unnamed institution", item.region || "Not specified", item.responded === true ? "Accomplished" : item.responded === false ? "Pending" : "Unknown"]), 
        theme: "grid", styles: { font: "times", fontSize: 12, cellPadding: 1.7, lineColor: [71, 85, 105], lineWidth: 0.25, textColor: [15, 23, 42] }, 
        headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", halign: "center" }, 
        columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 32 }, 2: { cellWidth: 33 } }, 
        didDrawPage: data => { if (data.pageNumber > 1) addHeader(); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139); pdf.text("Generated from the OCC / Office Monitoring register", 105, 287, { align: "center" }); pdf.text(`Page ${data.pageNumber}`, 190, 287, { align: "right" }); } 
      });
      const url = URL.createObjectURL(pdf.output("blob"));
      if (openInNewTab && pdfWindow) pdfWindow.location.href = url;
      else {
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { pdfWindow?.close(); console.error("Could not create PDF", error); } finally { setCreatingPdf(false); }
  };
  if (!office) return <section className="card p-10 text-center text-sm text-slate-500">No institution records available.</section>;
  return (
    <section aria-label={`${selectedOfficeName} institution register`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <Building2 size={23} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                Institution register
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                  {selectedOfficeName}
                  </h2>
                  </div>
                  </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
            {institutions.length} records
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">
              {checked} accomplished
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                {pending} pending
                </span>
                {unknown > 0 && <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">
                  {unknown} unknown
                  </span>}
                  </div>
      </div>
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-6 xl:flex-row xl:items-center">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
          <input type="search" aria-label="Search institutions or regions" 
          value={query} 
          onChange={event => setQuery(event.target.value)} 
          placeholder="Search institutions or regions…" 
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:min-w-80" />
          </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" 
          onClick={() => setPreviewOpen(true)} 
          className="inline-flex items-center gap-2 rounded-lg border border-blue-700 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            <Printer size={14} />
            Preview list
            </button>
            <div role="group" aria-label="Filter by survey status" className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {[["all", "All records"], ["checked", "Accomplished"], ["pending", "Pending"], ...(unknown ? [["unknown", "Unknown"]] : [])].map(([value, label]) => 
              <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`rounded-md px-3 py-2 text-xs font-medium transition focus-visible:outline-blue-600 ${status === value ? "bg-blue-700 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
                {label}</button>)}
                </div>
                </div>
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Institutions and survey status for {selectedOfficeName}</caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="w-16 px-6 py-3.5 font-semibold">
                No.
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Institution
              </th>
              <th scope="col" className="px-4 py-3.5 font-semibold">
                Region
              </th>
              <th scope="col" className="px-6 py-3.5 font-semibold">
                Survey status
              </th>
              </tr>
              </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map(item => 
            <tr key={item.row} className="transition hover:bg-slate-50">
              <td className="px-6 py-4 text-xs tabular-nums text-slate-400">
                {String(item.row).padStart(2, "0")}
              </td>
              <th scope="row" className="px-4 py-4 font-medium leading-6 text-slate-800">
                {item.name || "Unnamed institution"}
                </th>
              <td className="whitespace-nowrap px-4 py-4">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {item.region || "Not specified"}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.responded === true ? "bg-blue-100 text-blue-700" : item.responded === false ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-indigo-700"}`}>
                  {item.responded === true ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
                  {item.responded === true ? "Accomplished" : item.responded === false ? "Pending" : "Unknown"}
                </span>
              </td>
            </tr>
          )}</tbody>
        </table>
        {!visible.length && <div className="px-6 py-12 text-center">
          <Search size={24} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            {institutions.length ? "No matching institutions" : "No institution records available"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {institutions.length ? "Try a different search or survey status." : "Institution details will appear here when available."}
            </p>
            {institutions.length > 0 && <button onClick={() => { setQuery(""); setStatus("all"); }} className="mt-4 text-xs font-semibold text-blue-700 underline underline-offset-4">
              Clear filters
              </button>}
            </div>}
      </div>
      <div aria-live="polite" className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500">
        <span>
          Showing {visible.length} of {institutions.length} institutions
          </span>
          <span>Survey checks · Office assignments
            </span>
            </div>
      {previewOpen && <div className="occ-print-preview fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Print list preview">
        <div className="occ-print-content w-full rounded-sm bg-white shadow-2xl">
          <div className="print-actions flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-7">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Document preview
                </p>
                <p className="text-xs text-slate-500">
                  Open the ready-made PDF to save or print it.
                  </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={openPdf} disabled={creatingPdf} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                      <Printer size={14} />
                      {creatingPdf ? "Creating PDF…" : "Print"}
                      </button>
                      <button type="button" onClick={() => openPdf(false)} disabled={creatingPdf} className="inline-flex items-center gap-2 rounded-lg border border-blue-700 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                        <Download size={14} />
                        Save PDF
                        </button>
                      <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                        </button>
                        </div>
                        </div>
          <div className="occ-document-body">
            <img ref={headerRef} src="/Header.png" alt="Commission on Higher Education header" className="print-document-header" />
            <div className="occ-document-title">
              {/* <p>
                Institution Register
                </p> */}
                <h2>{selectedOfficeName}</h2>
                <p className="occ-document-subtitle">
                  Survey status: {statusLabel} · {visible.length} record{visible.length === 1 ? "" : "s"}{query ? ` · Search: ${query}` : ""}
                  </p>
                  </div>
                  <table className="occ-document-table">
                    <thead>
                      <tr>
                        <th>
                          Institution
                        </th>
                        <th>
                          Region
                        </th>
                        <th>
                          Survey status
                        </th>
                        </tr>
                        </thead>
                        <tbody>
                          {visible.map(item => <tr key={item.row}><td>
                              {item.name || "Unnamed institution"}
                            </td>
                            <td>
                              {item.region || "Not specified"}
                            </td>
                            <td>
                              {item.responded === true ? "Accomplished" : item.responded === false ? "Pending" : "Unknown"}
                            </td>
                          </tr>)}
                          </tbody>
                          </table>
                          {!visible.length && 
                          <p className="py-10 text-center text-sm text-slate-500">
                            No institutions match this filter.
                            </p>}
                            <div className="occ-document-footer">
                              Generated from CHED iCARE MONITORING SYSTEM
                              </div>
                              </div>
        </div>
      </div>}
    </section>
  );
}
