import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BarChart3, BriefcaseBusiness, Check, Download, Eye, FileText, LoaderCircle, Map, RefreshCw, Users, X } from "lucide-react";
import Loading from "../components/common/Loading";
import { useDashboard } from "../hooks/useDashboard";

const reports = [
  { id: "executive", title: "Executive Summary", text: "Management overview of participation, facilities, programs, and solo parent data.", Icon: FileText },
  { id: "regional", title: "Regional Report", text: "Campus distribution and coverage by region.", Icon: Map },
  { id: "solo", title: "Solo Parent Report", text: "Reported enrolled and community solo parent statistics.", Icon: Users },
  { id: "facility", title: "Facility & Program Report", text: "Readiness of facilities and documented programs by group.", Icon: BarChart3 },
  { id: "occ", title: "OCC / Office Report", text: "Institutional assignments and survey completion by office.", Icon: BriefcaseBusiness }
];

const number = value => Number(value || 0).toLocaleString();
const percent = (value, total) => total ? `${Math.round((Number(value || 0) / total) * 100)}%` : "0%";
const plural = (value, singular, pluralForm = `${singular}s`) => Number(value || 0) === 1 ? singular : pluralForm;
const responseSentence = item => `${item.name || "This item"} recorded ${number(item.yes)} affirmative ${plural(item.yes, "response")}, ${number(item.no)} negative ${plural(item.no, "response")}, and ${number(item.planned)} ${plural(item.planned, "response")} indicating plans or work in progress.`;

const normalizeOffice = value => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
const statusLabels = { all: "All records", accomplished: "Accomplished", pending: "Pending" };
const institutionStatus = item => item.responded === true ? "Accomplished" : item.responded === false ? "Pending" : "Unknown";
const availableOffices = (data, user) => (data.occOffices?.length ? data.occOffices : data.occDistribution || [])
  .filter(office => normalizeOffice(office.name).includes("office"))
  .filter(office => user?.role === "super_admin" || normalizeOffice(office.name) === normalizeOffice(user?.office));

function narrativeFor(id, data, user, selectedOffice) {
  const o = data.overview || {}, total = Number(o.totalResponses || 0), regions = data.regions || [], solo = data.soloParents || [];
  const enrolled = solo.find(item => item.name === "Enrolled") || {}, community = solo.find(item => item.name === "Community") || {};
  const facilities = data.facilityQuestions || [], programs = data.programQuestions || [];
  const facilityYes = facilities.reduce((sum, item) => sum + Number(item.yes || 0), 0), programYes = programs.reduce((sum, item) => sum + Number(item.yes || 0), 0);
  const campuses = regions.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const leading = [...regions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];

  if (id === "occ") {
    const offices = availableOffices(data, user)
      .filter(office => !selectedOffice || office.name === selectedOffice);
    if (!offices.length) return [["Office coverage", "No OCC / Office assignments are available for this report yet."]];
    const assigned = offices.reduce((sum, office) => sum + Number(office.value || 0), 0);
    return [
      ["Office coverage", `The OCC / Office register records ${number(assigned)} institutional ${plural(assigned, "assignment")} across ${number(offices.length)} ${plural(offices.length, "office")}.`],
      ...offices.map(office => [office.name, `${office.name} has ${number(office.value)} assigned ${plural(office.value, "institution")}, with ${number(office.responded)} accomplished and ${number(Math.max(0, Number(office.value || 0) - Number(office.responded || 0)))} pending. Survey completion stands at ${percent(office.responded, Number(office.value || 0))}.`])
    ];
  }

  if (id === "executive") return [
    ["Overview", `This report summarizes ${number(total)} submitted survey ${plural(total, "response")} on childcare development. The recorded submissions include ${number(o.lucResponses)} ${plural(o.lucResponses, "response")} from LUCs and ${number(o.sucResponses)} from SUCs.`],
    ["Childcare readiness", `Facilities for students were reported in ${number(o.facilityStudentsYes)} ${plural(o.facilityStudentsYes, "submission")}, representing ${percent(o.facilityStudentsYes, total)} of all responses. Documented student programs were reported in ${number(o.programStudentsYes)} ${plural(o.programStudentsYes, "submission")}, or ${percent(o.programStudentsYes, total)} of the total. Facilities for faculty and non-teaching personnel were reported by ${number(o.facilityFacultyYes)} ${plural(o.facilityFacultyYes, "respondent")}.`],
    ["Solo parent context", `Respondents reported ${number(o.enrolledSoloParents)} enrolled ${plural(o.enrolledSoloParents, "solo parent")}. This provides an initial indication of the learners and families who may benefit from responsive childcare support.`]
  ];
  if (id === "regional") return [
    ["Coverage", `The survey records ${number(campuses)} campus ${plural(campuses, "entry", "entries")} across ${number(regions.length)} ${plural(regions.length, "region")}. ${leading ? `${leading.name} has the strongest recorded presence, with ${number(leading.value)} campus ${plural(leading.value, "entry", "entries")}.` : "Regional coverage cannot yet be assessed because no campus locations were recorded."}`],
    ["Regional distribution", regions.length ? regions.map(item => `${item.name || "An unspecified region"} accounts for ${number(item.value)} recorded campus ${plural(item.value, "entry", "entries")}.`).join(" ") : "Add campus addresses to the source sheet to generate a regional distribution narrative."]
  ];
  if (id === "solo") return [
    ["Enrolled solo parents", `A total of ${number(enrolled.total)} enrolled ${plural(enrolled.total, "solo parent")} ${Number(enrolled.total || 0) === 1 ? "was" : "were"} reported. Of this total, ${number(enrolled.female)} ${plural(enrolled.female, "is", "are")} female and ${number(enrolled.male)} ${plural(enrolled.male, "is", "are")} male. Female solo parents make up ${percent(enrolled.female, enrolled.total)} of the reported enrolled total.`],
    ["Community context", `The surrounding community records ${number(community.total)} ${plural(community.total, "solo parent")}, including ${number(community.female)} female and ${number(community.male)} male. These figures help frame the wider support environment alongside the enrolled population.`]
  ];
  return [
    ["Overall readiness", `Across the measured groups, respondents recorded ${number(facilityYes)} affirmative facility ${plural(facilityYes, "response")} and ${number(programYes)} affirmative program ${plural(programYes, "response")}. Student facility readiness stands at ${percent(o.facilityStudentsYes, total)}, while documented student program readiness stands at ${percent(o.programStudentsYes, total)}.`],
    ["Facility findings", facilities.length ? facilities.map(responseSentence).join(" ") : "No facility findings are available yet."],
    ["Program findings", programs.length ? programs.map(responseSentence).join(" ") : "No program findings are available yet."]
  ];
}

export default function Reports({ user }) {
  const { data, loading, refreshing, error, reload } = useDashboard();
  const [activeId, setActiveId] = useState("executive");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const pdfDialog = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [recordStatus, setRecordStatus] = useState("all");
  const active = reports.find(report => report.id === activeId) || reports[0];
  const offices = useMemo(() => availableOffices(data || {}, user), [data, user]);
  const reportOffice = offices.some(office => office.name === selectedOffice)
    ? selectedOffice : user?.role === "super_admin" ? "" : offices[0]?.name || "";
  const sections = useMemo(() => narrativeFor(active.id, data || {}, user, reportOffice), [active.id, data, user, reportOffice]);
  const institutions = useMemo(() => offices
    .filter(office => !reportOffice || office.name === reportOffice)
    .flatMap(office => (office.institutions || []).map(item => ({
      ...(typeof item === "string" ? { name: item, responded: null } : item), office: office.name
    }))), [offices, reportOffice]);
  const visibleInstitutions = institutions.filter(item => recordStatus === "all"
    || (recordStatus === "accomplished" ? item.responded === true : item.responded === false));
  const listDescription = `${reportOffice || "All OCC / Offices"} - ${statusLabels[recordStatus]}: ${number(visibleInstitutions.length)} of ${number(institutions.length)} available records.`;
  const emptyListMessage = institutions.length ? "No institutions match the selected status." : "No institution records are available for the selected office(s).";
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const modalOpen = Boolean(previewUrl);
  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modalOpen]);
  useEffect(() => {
    if (!previewUrl) return;
    const dialog = pdfDialog.current;
    dialog.showModal();
    return () => { dialog.close(); };
  }, [previewUrl]);
  if (loading && !data) return <Loading label="Preparing reports..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold text-slate-900">Unable to load reports</h2><p className="mt-2 text-sm text-slate-500">{error || "No report data is available."}</p><button onClick={() => reload()} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  const createPdf = async () => {
    setExporting(true);
    setExportError("");
    try {
      const { jsPDF } = await import("jspdf"), doc = new jsPDF();
      const headerImage = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = "/Header.png"; });
      // Header.png is a very high-resolution source image. Resize it before giving
      // it to jsPDF so the browser does not try to embed its full 31,901px width.
      const headerCanvas = document.createElement("canvas"), headerWidth = 1600;
      headerCanvas.width = headerWidth;
      headerCanvas.height = Math.round(headerWidth * (headerImage.height / headerImage.width));
      const headerContext = headerCanvas.getContext("2d");
      headerContext.fillStyle = "#ffffff";
      headerContext.fillRect(0, 0, headerCanvas.width, headerCanvas.height);
      headerContext.drawImage(headerImage, 0, 0, headerCanvas.width, headerCanvas.height);
      const headerData = headerCanvas.toDataURL("image/jpeg", 0.92);
      const pageWidth = doc.internal.pageSize.getWidth();
      const addLetterhead = () => {
        const width = pageWidth - 28, height = width * (headerImage.height / headerImage.width);
        doc.addImage(headerData, "JPEG", 14, 12, width, height);
        return 12 + height;
      };
      const reportDate = new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric" });
      const margin = 18, contentWidth = pageWidth - margin * 2;
      const pageBottom = doc.internal.pageSize.getHeight() - 25;
      let y = addLetterhead() + 12;
      const nextPage = () => { doc.addPage(); y = addLetterhead() + 12; };
      const ensureSpace = height => { if (y + height > pageBottom) nextPage(); };
      doc.setDrawColor(8, 38, 77); doc.setLineWidth(0.6);
      doc.line(margin, y, pageWidth - margin, y); y += 9;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      doc.text("CHILDCARE DEVELOPMENT SURVEY", margin, y); y += 10;
      doc.setFontSize(22); doc.setTextColor(8, 38, 77);
      const titleLines = doc.splitTextToSize(active.title, contentWidth);
      doc.text(titleLines, margin, y, { lineHeightFactor: 1.15 });
      y += titleLines.length * 9 + 3;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      const metadata = [
        ["PREPARED BY", user?.name || user?.email || "Dashboard User"],
        ["REPORT DATE", reportDate]
      ];
      const metadataWidth = (contentWidth - 10) / 2;
      const metadataLines = metadata.map(([, value]) => doc.splitTextToSize(value, metadataWidth));
      metadata.forEach(([label], index) => {
        const x = margin + index * (metadataWidth + 10);
        doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text(label, x, y);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
        doc.text(metadataLines[index], x, y + 5, { lineHeightFactor: 1.4 });
      });
      y += 10 + Math.max(...metadataLines.map(lines => lines.length)) * 4.5;
      const metricWidth = (contentWidth - 8) / 3;
      ensureSpace(32);
      metrics.forEach(([label, value], index) => {
        const x = margin + index * (metricWidth + 4);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, y, metricWidth, 25, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(8, 38, 77);
        doc.text(value, x + 5, y + 10);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
        doc.text(doc.splitTextToSize(label, metricWidth - 10), x + 5, y + 17);
      });
      y += 35;
      sections.forEach(([heading, paragraph], index) => {
        const lineHeight = 5.5;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(paragraph, contentWidth - 10);
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        const headingLines = doc.splitTextToSize(heading, contentWidth - 14);
        const headingHeight = headingLines.length * 5;
        // Keep short sections together; long narratives flow across as many pages as needed.
        const requiredHeight = headingHeight + 8 + lines.length * lineHeight;
        const freshPageHeight = pageBottom - (12 + (pageWidth - 28) * (headerImage.height / headerImage.width) + 12);
        ensureSpace(requiredHeight <= freshPageHeight ? requiredHeight : headingHeight + 8 + Math.min(3, lines.length) * lineHeight);
        const drawHeading = continued => {
          doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(29, 78, 137);
          doc.text(String(index + 1).padStart(2, "0"), margin, y);
          doc.setFontSize(11); doc.setTextColor(8, 38, 77);
          const headingText = continued ? doc.splitTextToSize(`${heading} (continued)`, contentWidth - 14) : headingLines;
          doc.text(headingText, margin + 10, y, { lineHeightFactor: 1.3 });
          y += headingText.length * 5 + 4;
        };
        drawHeading(false);
        let offset = 0;
        while (offset < lines.length) {
          const capacity = Math.max(0, Math.floor((pageBottom - y) / lineHeight));
          if (!capacity) { nextPage(); drawHeading(true); continue; }
          const chunk = lines.slice(offset, offset + capacity);
          doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(51, 65, 85);
          doc.text(chunk, margin + 10, y, { lineHeightFactor: lineHeight / (10.5 * 25.4 / 72) });
          y += chunk.length * lineHeight;
          offset += chunk.length;
          if (offset < lines.length) { nextPage(); drawHeading(true); }
        }
        y += 9;
      });
      if (active.id === "occ") {
        const { default: autoTable } = await import("jspdf-autotable");
        const continuationTop = 12 + (pageWidth - 28) * (headerImage.height / headerImage.width) + 10;
        ensureSpace(35);
        const tableTop = y;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
        doc.text("Institution register", margin, tableTop);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        const scopeLines = doc.splitTextToSize(listDescription, contentWidth);
        doc.setTextColor(71, 85, 105);
        doc.text(scopeLines, margin, tableTop + 7);
        autoTable(doc, {
          startY: tableTop + 10 + scopeLines.length * 4,
          margin: { top: continuationTop, bottom: 25, left: margin, right: margin },
          rowPageBreak: "avoid",
          showHead: "everyPage",
          head: [reportOffice ? ["Institution", "Region", "Survey status"] : ["Institution", "Region", "OCC / Office", "Survey status"]],
          body: visibleInstitutions.length
            ? visibleInstitutions.map(item => [item.name || "Unnamed institution", item.region || "Not specified", ...(reportOffice ? [] : [item.office]), institutionStatus(item)])
            : [[{ content: emptyListMessage, colSpan: reportOffice ? 3 : 4 }]],
          theme: "striped",
          styles: { font: "helvetica", fontSize: 8.5, cellPadding: 3, overflow: "linebreak", textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.1, valign: "middle" },
          headStyles: { fillColor: [8, 38, 77], textColor: [255, 255, 255], fontStyle: "bold", cellPadding: 3.5 },
          alternateRowStyles: { fillColor: [245, 248, 252] },
          columnStyles: reportOffice ? { 0: { cellWidth: 110 }, 1: { cellWidth: 32 }, 2: { cellWidth: 32 } } : { 0: { cellWidth: 68 }, 1: { cellWidth: 24 }, 2: { cellWidth: 50 }, 3: { cellWidth: 32 } },
          didDrawPage: () => { addLetterhead(); }
        });
      }
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) { doc.setPage(page); const pageHeight = doc.internal.pageSize.getHeight(); doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text("Childcare Development Dashboard", 14, pageHeight - 10); doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" }); }
      const fileTitle = active.id === "occ" ? `${active.title} - ${reportOffice || "All offices"} - ${statusLabels[recordStatus]}` : active.title;
      return { blob: doc.output("blob"), name: `${fileTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf` };
    } catch (error) { console.error("Could not create PDF report", error); setExportError("The PDF could not be created. Please try again."); } finally { setExporting(false); }
  };

  const previewPdf = async () => {
    setExporting(true);
    try {
      const result = await createPdf();
      if (!result) return;
      setPreviewUrl(URL.createObjectURL(result.blob));
      setPreviewName(result.name);
    } finally { setExporting(false); }
  };

  const downloadPdf = async () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = previewName;
    link.click();
  };

  const exportPdf = async () => {
    const result = await createPdf();
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const overview = data.overview || {};
  const total = Number(overview.totalResponses || 0);
  const regionalTotal = (data.regions || []).reduce((sum, item) => sum + Number(item.value || 0), 0);
  const solo = data.soloParents || [];
  const scopedOffices = offices.filter(office => !reportOffice || office.name === reportOffice);
  const assigned = scopedOffices.reduce((sum, office) => sum + Number(office.value || 0), 0);
  const accomplished = scopedOffices.reduce((sum, office) => sum + Number(office.responded || 0), 0);
  const metrics = active.id === "regional"
    ? [["Campus entries", number(regionalTotal)], ["Regions represented", number((data.regions || []).length)], ["Survey responses", number(total)]]
    : active.id === "solo"
      ? [["Enrolled solo parents", number(solo.find(item => item.name === "Enrolled")?.total)], ["Community solo parents", number(solo.find(item => item.name === "Community")?.total)], ["Survey responses", number(total)]]
      : active.id === "occ"
        ? [["Assigned institutions", number(assigned)], ["Accomplished", number(accomplished)], ["Completion rate", percent(accomplished, assigned)]]
        : [["Survey responses", number(total)], ["Student facilities", percent(overview.facilityStudentsYes, total)], ["Student programs", percent(overview.programStudentsYes, total)]];
  const updated = data.updatedAt ? new Date(data.updatedAt) : null;
  const updatedLabel = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Update time unavailable";
  const ActiveIcon = active.Icon;

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200"><FileText size={15} />Reporting center</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl uppercase">Reports</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Turn survey findings into clear, shareable reports. Explore a summary, review the details, and export your PDF.</p></div>
        <button type="button" onClick={() => reload({ force: true })} disabled={refreshing || exporting} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Refreshing..." : "Refresh data"}</button>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-blue-200"><span>{reports.length} report types</span><span>PDF format</span><span>Data updated: {updatedLabel} (PHT)</span>{data.source === "demo" && <span className="rounded-full bg-amber-200/15 px-2 py-1 text-amber-100">Demo data</span>}</div>
    </header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing the most recently available data. {error}</div>}
    {exportError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{exportError}</div>}
    <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="report-types-title">
      <h2 id="report-types-title" className="text-base font-semibold text-slate-900">Choose a report</h2>
      <p className="mb-4 mt-1 text-xs leading-5 text-slate-500">Select the focus of your report.</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{reports.map(report => {
        const Icon = report.Icon, selected = active.id === report.id;
        return <button type="button" key={report.id} aria-pressed={selected} disabled={exporting} onClick={() => { setActiveId(report.id); setExportError(""); }} className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60 ${selected ? "border-blue-300 bg-blue-50/70" : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-[#08264d] text-white" : "bg-slate-100 text-slate-500"}`}><Icon size={19} /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">{report.title}{selected && <Check size={15} className="shrink-0 text-blue-700" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{report.text}</span></span>
        </button>;
      })}</div>
    </section>
    <div className="min-w-0 space-y-4">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="report-summary-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-[#08264d]"><ActiveIcon size={23} /></span><div><p className="text-xs font-medium text-slate-500">Selected report</p><h2 id="report-summary-title" className="mt-1 text-lg font-semibold text-slate-900">{active.title}</h2>{active.id === "occ" && <p className="mt-1 text-xs text-slate-500">{reportOffice || "All OCC / Offices"} · {statusLabels[recordStatus]}</p>}</div></div>
      </div>
      {active.id === "occ" && <section aria-labelledby="office-filters-title" className="border-b border-slate-200 p-5 sm:p-6">
      <h3 id="office-filters-title" className="mb-4 text-sm font-semibold text-slate-900">Office filters</h3>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
      <label htmlFor="report-office" className="block text-sm font-semibold text-slate-900">OCC / Office to report</label>
      <select id="report-office" value={reportOffice} onChange={event => setSelectedOffice(event.target.value)} disabled={exporting || !offices.length} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60">
        {user?.role === "super_admin" && offices.length > 0 && <option value="">All OCC / Offices</option>}
        {!offices.length && <option value="">No offices available</option>}
        {offices.map(office => <option key={office.name} value={office.name}>{office.name}</option>)}
      </select>
      </div>
      <div>
      <label htmlFor="report-status" className=" block text-sm font-semibold text-slate-900">Records to show</label>
      <select id="report-status" value={recordStatus} onChange={event => setRecordStatus(event.target.value)} disabled={exporting} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60">
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">The PDF covers the selected office and record status.</p>
    </section>}
      {active.id !== "occ" && <><dl className="grid gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-3 sm:p-6">{metrics.map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-bold tracking-tight text-[#08264d]">{value}</dd></div>)}</dl>
      <div className="space-y-6 p-5 sm:p-6" aria-live="polite" aria-atomic="true">
        <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Report findings</h3><span className="text-xs text-slate-400">{sections.length} sections</span></div>
        {sections.map(([heading, paragraph], index) => <article key={`${active.id}-${heading}-${index}`} className="flex gap-3 sm:gap-4"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h3 className="font-semibold text-slate-900">{heading}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{paragraph}</p></div></article>)}
      </div>
      </>}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:px-6">
        {active.id !== "occ" && <p className="max-w-xs text-xs leading-5 text-slate-500">Export includes the official letterhead and report findings.</p>}
        <div className="flex flex-wrap gap-2"><button type="button" onClick={previewPdf} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"><Eye size={16} />Preview PDF</button><button type="button" onClick={exportPdf} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#08264d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e427d] disabled:cursor-wait disabled:opacity-60">{exporting ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}{exporting ? "Preparing..." : "Download PDF"}</button></div>
      </footer>
    </section>
    <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500"><ArrowUpRight size={15} className="mt-0.5 shrink-0 text-blue-600" />Figures reflect available survey records. Refresh data before preparing a report for distribution.</p>
    </div>
    </div>
    {previewUrl && <dialog ref={pdfDialog} aria-labelledby="pdf-preview-title" onCancel={() => setPreviewUrl("")} className="m-auto w-[calc(100%-1.5rem)] max-w-6xl rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-950/70" onClick={event => { if (event.target === event.currentTarget) setPreviewUrl(""); }}><section className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6"><div><h2 id="pdf-preview-title" className="font-semibold text-slate-900">PDF preview</h2><p className="text-xs text-slate-500">Review the report before saving.</p></div><div className="flex items-center gap-2"><button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-xl bg-[#08264d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e427d]"><Download size={16} />Save PDF</button><button type="button" autoFocus aria-label="Close PDF preview" onClick={() => setPreviewUrl("")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div></header><iframe title={`${active.title} PDF preview`} src={previewUrl} className="min-h-0 flex-1 bg-slate-100" /></section></dialog>}

  </div>;
}
