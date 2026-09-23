import { useEffect, useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, Download, Eye, FileText, Map, Users, X } from "lucide-react";
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
const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

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
    const accomplished = offices.reduce((sum, office) => sum + Number(office.responded || 0), 0);
    const pending = Math.max(0, assigned - accomplished);
    return [
      ["Office coverage", `The OCC / Office register records ${number(assigned)} institutional ${plural(assigned, "assignment")} across ${number(offices.length)} ${plural(offices.length, "office")}.`],
      ["Survey progress", `Of the recorded assignments, ${number(accomplished)} ${plural(accomplished, "has", "have")} accomplished the survey and ${number(pending)} ${plural(pending, "is", "are")} pending. Overall survey completion stands at ${percent(accomplished, assigned)}.`],
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
  const { data, loading, error, reload } = useDashboard();
  const [activeId, setActiveId] = useState("executive");
  const [exporting, setExporting] = useState(false);
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
  if (loading && !data) return <Loading label="Preparing reports..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold text-slate-900">Unable to load reports</h2><p className="mt-2 text-sm text-slate-500">{error || "No report data is available."}</p><button onClick={() => reload()} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  const createPdf = async () => {
    setExporting(true);
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
      const reportDate = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
      let y = addLetterhead() + 12;
      doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.4); doc.line(14, y, pageWidth - 14, y); y += 12;
      doc.setFont("times", "bold"); doc.setFontSize(15); doc.setTextColor(15, 23, 42); doc.text("CHILDCARE DEVELOPMENT SURVEY", pageWidth / 2, y, { align: "center" }); y += 8;
      doc.setFontSize(13); doc.text(active.title.toUpperCase(), pageWidth / 2, y, { align: "center" }); y += 12;
      doc.setFont("times", "normal"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
      doc.text(`Prepared by: ${user?.name || user?.email || "Dashboard User"}`, 14, y);
      doc.text(`Date: ${reportDate}`, pageWidth - 14, y, { align: "right" }); y += 8;
      doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.line(14, y, pageWidth - 14, y); y += 14;
      sections.forEach(([heading, paragraph], index) => {
        const compact = active.id === "occ";
        const lineHeight = compact ? 4 : 5.5;
        doc.setFont("times", "normal"); doc.setFontSize(compact ? 9 : 10.5);
        const lines = doc.splitTextToSize(paragraph, 180);
        doc.setFont("times", "bold"); doc.setFontSize(compact ? 10 : 11.5);
        const headingLines = doc.splitTextToSize(`${romanNumerals[index] || index + 1}. ${heading.toUpperCase()}`, 180);
        const headingHeight = headingLines.length * (compact ? 4 : 5);
        if (y + headingHeight + 3 + lines.length * lineHeight > 274) { doc.addPage(); y = addLetterhead() + 10; }
        doc.setTextColor(15, 23, 42); doc.text(headingLines, 14, y); y += headingHeight + (compact ? 1 : 3);
        doc.setFont("times", "normal"); doc.setFontSize(compact ? 9 : 10.5); doc.setTextColor(51, 65, 85);
        doc.text(lines, 14, y, { maxWidth: 180, align: "justify", lineHeightFactor: compact ? 1.26 : 1.48 });
        y += lines.length * lineHeight + (compact ? 5 : 13);
      });
      if (active.id === "occ") {
        const { default: autoTable } = await import("jspdf-autotable");
        const continuationTop = 12 + (pageWidth - 28) * (headerImage.height / headerImage.width) + 10;
        if (y + 30 > 274) { doc.addPage(); y = addLetterhead() + 10; }
        const tableTop = y;
        doc.setFont("times", "bold"); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
        doc.text("INSTITUTION LIST", 14, tableTop);
        doc.setFont("times", "normal"); doc.setFontSize(10);
        const scopeLines = doc.splitTextToSize(listDescription, 180);
        doc.text(scopeLines, 14, tableTop + 8);
        autoTable(doc, {
          startY: tableTop + 10 + scopeLines.length * 4,
          margin: { top: continuationTop, bottom: 22, left: 14, right: 14 },
          head: [reportOffice ? ["Institution", "Region", "Survey status"] : ["Institution", "Region", "OCC / Office", "Survey status"]],
          body: visibleInstitutions.length
            ? visibleInstitutions.map(item => [item.name || "Unnamed institution", item.region || "Not specified", ...(reportOffice ? [] : [item.office]), institutionStatus(item)])
            : [[{ content: emptyListMessage, colSpan: reportOffice ? 3 : 4 }]],
          theme: "grid",
          styles: { font: "times", fontSize: 8, cellPadding: 1.2, overflow: "linebreak" },
          headStyles: { fillColor: [8, 38, 77] },
          columnStyles: reportOffice ? { 0: { cellWidth: 126 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 } } : { 0: { cellWidth: 72 }, 1: { cellWidth: 24 }, 2: { cellWidth: 58 }, 3: { cellWidth: 28 } },
          didDrawPage: () => { addLetterhead(); }
        });
      }
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) { doc.setPage(page); const pageHeight = doc.internal.pageSize.getHeight(); doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16); doc.setFont("times", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text("Childcare Development Dashboard", 14, pageHeight - 10); doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" }); }
      const fileTitle = active.id === "occ" ? `${active.title} - ${reportOffice || "All offices"} - ${statusLabels[recordStatus]}` : active.title;
      return { blob: doc.output("blob"), name: `${fileTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf` };
    } catch (exportError) { console.error("Could not create PDF report", exportError); window.alert("The PDF could not be created. Please try again."); } finally { setExporting(false); }
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

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">Reporting center</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl uppercase">Reports</h1><p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">Review live dashboard data as management-ready written reports and download them as PDFs.</p></header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing the most recently available data. {error}</div>}
    <section className="grid gap-4 md:grid-cols-2">{reports.map(report => { const Icon = report.Icon, selected = active.id === report.id; return <button type="button" key={report.id} onClick={() => setActiveId(report.id)} className={`card p-6 text-left transition ${selected ? "ring-2 ring-blue-600" : "hover:border-blue-200 hover:shadow-md"}`}><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={21} /></div>{selected && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Selected</span>}</div><h2 className="mt-4 font-semibold text-slate-900">{report.title}</h2><p className="mt-1 text-sm text-slate-500">{report.text}</p></button>; })}</section>
    {active.id === "occ" && <section className="card p-5 sm:p-6">
      <label htmlFor="report-office" className="block text-sm font-semibold text-slate-900">OCC / Office to report</label>
      <select id="report-office" value={reportOffice} onChange={event => setSelectedOffice(event.target.value)} disabled={exporting || !offices.length} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:max-w-xl">
        {user?.role === "super_admin" && offices.length > 0 && <option value="">All OCC / Offices</option>}
        {!offices.length && <option value="">No offices available</option>}
        {offices.map(office => <option key={office.name} value={office.name}>{office.name}</option>)}
      </select>
      <label htmlFor="report-status" className="mt-4 block text-sm font-semibold text-slate-900">Records to show</label>
      <select id="report-status" value={recordStatus} onChange={event => setRecordStatus(event.target.value)} disabled={exporting} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:max-w-xl">
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <p className="mt-2 text-sm text-slate-500">The summary covers the selected office. The institution list and PDF table use the selected status.</p>
    </section>}
    <article className="card overflow-hidden"><div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Written report</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{active.title}</h2></div><button type="button" onClick={previewPdf} disabled={exporting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#08264d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e427d] disabled:cursor-wait disabled:opacity-60"><Eye size={17} />{exporting ? "Preparing preview..." : "Preview PDF"}</button></div><div className="space-y-7 p-5 text-[15px] leading-7 text-slate-700 sm:p-7">{sections.map(([heading, paragraph]) => <section key={heading}><h3 className="mb-2 text-base font-semibold text-slate-900">{heading}</h3><p>{paragraph}</p></section>)}</div></article>
    {previewUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewUrl(""); }}><section role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6"><div><h2 id="pdf-preview-title" className="font-semibold text-slate-900">PDF preview</h2><p className="text-xs text-slate-500">Review the report before saving.</p></div><div className="flex items-center gap-2"><button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-xl bg-[#08264d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e427d]"><Download size={16} />Save PDF</button><button type="button" aria-label="Close PDF preview" onClick={() => setPreviewUrl("")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div></header><iframe title={`${active.title} PDF preview`} src={previewUrl} className="min-h-0 flex-1 bg-slate-100" /></section></div>}
    {active.id === "occ" && <section className="card overflow-hidden" aria-labelledby="report-institution-list">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <h2 id="report-institution-list" className="text-lg font-semibold text-slate-900">Institution list</h2>
        <p className="mt-1 text-sm text-slate-500" aria-live="polite">{listDescription}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{listDescription}</caption>
          <thead className="bg-slate-50 text-slate-600"><tr>{["Institution", "Region", "OCC / Office", "Survey status"].map(label => <th key={label} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {visibleInstitutions.map((item, index) => <tr key={`${item.office}-${index}`} className="hover:bg-slate-50">

              <td className="min-w-56 px-5 py-3 font-medium text-slate-900">{item.name || "Unnamed institution"}</td>
              <td className="px-5 py-3 text-slate-600">{item.region || "Not specified"}</td>
              <td className="min-w-48 px-5 py-3 text-slate-600">{item.office}</td>
              <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.responded === true ? "bg-emerald-50 text-emerald-700" : item.responded === false ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{institutionStatus(item)}</span></td>
            </tr>)}
            {!visibleInstitutions.length && <tr><td colSpan={4} className="p-8 text-center text-slate-500">{emptyListMessage}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>}
  </div>;
}
