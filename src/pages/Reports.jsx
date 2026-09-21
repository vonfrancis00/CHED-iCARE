import { useMemo, useState } from "react";
import { BarChart3, Download, FileText, Map, Users } from "lucide-react";
import Loading from "../components/common/Loading";
import { useDashboard } from "../hooks/useDashboard";

const reports = [
  { id: "executive", title: "Executive Summary", text: "Management overview of participation, facilities, programs, and solo parent data.", Icon: FileText },
  { id: "regional", title: "Regional Report", text: "Campus distribution and coverage by region.", Icon: Map },
  { id: "solo", title: "Solo Parent Report", text: "Reported enrolled and community solo parent statistics.", Icon: Users },
  { id: "facility", title: "Facility & Program Report", text: "Readiness of facilities and documented programs by group.", Icon: BarChart3 }
];

const number = value => Number(value || 0).toLocaleString();
const percent = (value, total) => total ? `${Math.round((Number(value || 0) / total) * 100)}%` : "0%";
const plural = (value, singular, pluralForm = `${singular}s`) => Number(value || 0) === 1 ? singular : pluralForm;
const responseSentence = item => `${item.name || "This item"} recorded ${number(item.yes)} affirmative ${plural(item.yes, "response")}, ${number(item.no)} negative ${plural(item.no, "response")}, and ${number(item.planned)} ${plural(item.planned, "response")} indicating plans or work in progress.`;
const romanNumerals = ["I", "II", "III", "IV", "V"];

function narrativeFor(id, data) {
  const o = data.overview || {}, total = Number(o.totalResponses || 0), regions = data.regions || [], solo = data.soloParents || [];
  const enrolled = solo.find(item => item.name === "Enrolled") || {}, community = solo.find(item => item.name === "Community") || {};
  const facilities = data.facilityQuestions || [], programs = data.programQuestions || [];
  const facilityYes = facilities.reduce((sum, item) => sum + Number(item.yes || 0), 0), programYes = programs.reduce((sum, item) => sum + Number(item.yes || 0), 0);
  const campuses = regions.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const leading = [...regions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];

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

export default function Reports() {
  const { data, loading, error, reload } = useDashboard();
  const [activeId, setActiveId] = useState("executive");
  const [exporting, setExporting] = useState(false);
  const active = reports.find(report => report.id === activeId) || reports[0];
  const sections = useMemo(() => narrativeFor(active.id, data || {}), [active.id, data]);
  if (loading && !data) return <Loading label="Preparing reports..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold text-slate-900">Unable to load reports</h2><p className="mt-2 text-sm text-slate-500">{error || "No report data is available."}</p><button onClick={() => reload()} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  const downloadPdf = async () => {
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
      doc.text("Prepared by: Childcare Development Dashboard", 14, y);
      doc.text(`Date: ${reportDate}`, pageWidth - 14, y, { align: "right" }); y += 8;
      doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.line(14, y, pageWidth - 14, y); y += 14;
      sections.forEach(([heading, paragraph], index) => { const lines = doc.splitTextToSize(paragraph, 180); if (y + 14 + lines.length * 5.5 > 274) { doc.addPage(); y = addLetterhead() + 14; } doc.setFont("times", "bold"); doc.setFontSize(11.5); doc.setTextColor(15, 23, 42); doc.text(`${romanNumerals[index] || index + 1}. ${heading.toUpperCase()}`, 14, y); y += 8; doc.setFont("times", "normal"); doc.setFontSize(10.5); doc.setTextColor(51, 65, 85); doc.text(lines, 14, y, { maxWidth: 180, align: "justify" }); y += lines.length * 5.5 + 13; });
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) { doc.setPage(page); const pageHeight = doc.internal.pageSize.getHeight(); doc.setDrawColor(148, 163, 184); doc.setLineWidth(0.2); doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16); doc.setFont("times", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text("Childcare Development Dashboard", 14, pageHeight - 10); doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" }); }
      doc.save(`${active.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } catch (exportError) { console.error("Could not create PDF report", exportError); window.alert("The PDF could not be created. Please try again."); } finally { setExporting(false); }
  };

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">Reporting center</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Reports</h1><p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">Review live dashboard data as management-ready written reports and download them as PDFs.</p></header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing the most recently available data. {error}</div>}
    <section className="grid gap-4 md:grid-cols-2">{reports.map(report => { const Icon = report.Icon, selected = active.id === report.id; return <button type="button" key={report.id} onClick={() => setActiveId(report.id)} className={`card p-6 text-left transition ${selected ? "ring-2 ring-blue-600" : "hover:border-blue-200 hover:shadow-md"}`}><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={21} /></div>{selected && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Selected</span>}</div><h2 className="mt-4 font-semibold text-slate-900">{report.title}</h2><p className="mt-1 text-sm text-slate-500">{report.text}</p></button>; })}</section>
    <article className="card overflow-hidden"><div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Written report</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{active.title}</h2></div><button type="button" onClick={downloadPdf} disabled={exporting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#08264d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e427d] disabled:cursor-wait disabled:opacity-60"><Download size={17} />{exporting ? "Preparing PDF..." : "Download PDF"}</button></div><div className="space-y-7 p-5 text-[15px] leading-7 text-slate-700 sm:p-7">{sections.map(([heading, paragraph]) => <section key={heading}><h3 className="mb-2 text-base font-semibold text-slate-900">{heading}</h3><p>{paragraph}</p></section>)}</div></article>
  </div>;
}
