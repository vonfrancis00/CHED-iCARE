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
const headings = id => id === "facility" ? ["Measure", "Yes", "No", "Plans / Work"] : ["Measure", "Count"];

function reportRows(id, data) {
  const o = data.overview || {};
  if (id === "executive") return [["Survey responses", number(o.totalResponses)], ["LUC responses", number(o.lucResponses)], ["SUC responses", number(o.sucResponses)], ["Facilities for faculty / non-teaching", number(o.facilityFacultyYes)], ["Facilities for students", number(o.facilityStudentsYes)], ["Documented programs for students", number(o.programStudentsYes)], ["Enrolled solo parents", number(o.enrolledSoloParents)]];
  if (id === "regional") return (data.regions || []).map(item => [item.name || "Unspecified region", number(item.value)]);
  if (id === "solo") return (data.soloParents || []).flatMap(item => [[`${item.name || "Reported"} total`, number(item.total)], [`${item.name || "Reported"} female`, number(item.female)], [`${item.name || "Reported"} male`, number(item.male)]]);
  return [...(data.facilityQuestions || []).map(item => [`Facility - ${item.name}`, number(item.yes), number(item.no), number(item.planned)]), ...(data.programQuestions || []).map(item => [`Program - ${item.name}`, number(item.yes), number(item.no), number(item.planned)])];
}

function detailsFor(id, data) {
  const o = data.overview || {}, total = Number(o.totalResponses || 0), regions = data.regions || [], solo = data.soloParents || [];
  const enrolled = solo.find(item => item.name === "Enrolled") || {}, community = solo.find(item => item.name === "Community") || {};
  const facilities = data.facilityQuestions || [], programs = data.programQuestions || [];
  const facilityYes = facilities.reduce((sum, item) => sum + Number(item.yes || 0), 0), programYes = programs.reduce((sum, item) => sum + Number(item.yes || 0), 0);
  const top = [...regions].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  if (id === "executive") return { summary: "A high-level view of survey participation and childcare readiness across all submitted responses.", metrics: [["Responses", number(total)], ["LUC + SUC responses", number(Number(o.lucResponses || 0) + Number(o.sucResponses || 0))], ["Student facilities", number(o.facilityStudentsYes)], ["Student programs", number(o.programStudentsYes)]], insight: `Student facilities are reported by ${percent(o.facilityStudentsYes, total)} of all responses; documented student programs are reported by ${percent(o.programStudentsYes, total)}.` };
  if (id === "regional") return { summary: "Shows the distribution of participating campuses and identifies the strongest recorded coverage area.", metrics: [["Regions tracked", number(regions.length)], ["Campuses recorded", number(regions.reduce((sum, item) => sum + Number(item.value || 0), 0))], ["Leading region", top?.name || "No data"], ["Leading region campuses", number(top?.value)]], insight: top ? `${top.name} has the largest recorded campus presence, with ${number(top.value)} campuses.` : "Add campus addresses to the source sheet to generate regional coverage insights." };
  if (id === "solo") return { summary: "Breaks down reported solo parent counts for enrolled students and the surrounding community.", metrics: [["Enrolled solo parents", number(enrolled.total)], ["Enrolled female", number(enrolled.female)], ["Enrolled male", number(enrolled.male)], ["Community solo parents", number(community.total)]], insight: `Female solo parents account for ${percent(enrolled.female, enrolled.total)} of the reported enrolled solo parent total.` };
  return { summary: "Compares available childcare facilities and documented programs for faculty, students, and communities.", metrics: [["Facility yes responses", number(facilityYes)], ["Program yes responses", number(programYes)], ["Student facility readiness", percent(o.facilityStudentsYes, total)], ["Student program readiness", percent(o.programStudentsYes, total)]], insight: `Reported programs exceed reported facilities by ${number(Math.max(0, programYes - facilityYes))} positive responses across the measured groups.` };
}

export default function Reports() {
  const { data, loading, error, reload } = useDashboard();
  const [activeId, setActiveId] = useState("executive");
  const [exporting, setExporting] = useState(false);
  const active = reports.find(report => report.id === activeId) || reports[0];
  const rows = useMemo(() => data ? reportRows(active.id, data) : [], [active.id, data]);
  const details = useMemo(() => detailsFor(active.id, data || {}), [active.id, data]);

  if (loading && !data) return <Loading label="Preparing reports..." />;
  if (!data) return <div className="card p-8"><h2 className="font-semibold text-slate-900">Unable to load reports</h2><p className="mt-2 text-sm text-slate-500">{error || "No report data is available."}</p><button onClick={() => reload()} className="mt-4 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Retry</button></div>;

  const downloadPdf = async () => {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(active.title, 14, 20);
      doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.text("Childcare Development Dashboard", 14, 28); doc.text(`Generated ${new Date().toLocaleString()}`, 14, 34);
      const insight = doc.splitTextToSize(`Key insight: ${details.insight}`, 180); doc.text(insight, 14, 42);
      autoTableModule.default(doc, { head: [headings(active.id)], body: rows, startY: 48 + insight.length * 5, theme: "grid", headStyles: { fillColor: [8, 38, 77] } });
      doc.save(`${active.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
    } catch (exportError) { console.error("Could not create PDF report", exportError); window.alert("The PDF could not be created. Please try again."); } finally { setExporting(false); }
  };

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] border border-blue-200/20 bg-gradient-to-br from-[#06162d] via-[#0d2342] to-[#1d4f91] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-8"><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100">Reporting center</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl uppercase">Reports</h1><p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">Review live dashboard data, understand the key findings, and download management-ready PDF reports.</p></header>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Showing the most recently available data. {error}</div>}
    <section className="grid gap-4 md:grid-cols-2">{reports.map(report => { const Icon = report.Icon, selected = active.id === report.id; return <button type="button" key={report.id} onClick={() => setActiveId(report.id)} className={`card p-6 text-left transition ${selected ? "ring-2 ring-blue-600" : "hover:border-blue-200 hover:shadow-md"}`}><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={21} /></div>{selected && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Selected</span>}</div><h2 className="mt-4 font-semibold text-slate-900">{report.title}</h2><p className="mt-1 text-sm text-slate-500">{report.text}</p></button>; })}</section>
    <section className="card overflow-hidden"><div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="text-xl font-semibold text-slate-900">{active.title}</h2><p className="mt-1 text-sm text-slate-500">{details.summary}</p></div><button type="button" onClick={downloadPdf} disabled={exporting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#08264d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e427d] disabled:cursor-wait disabled:opacity-60"><Download size={17} />{exporting ? "Preparing PDF..." : "Download PDF"}</button></div><div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 xl:grid-cols-4">{details.metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p></div>)}</div><div className="border-b border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900"><span className="font-semibold">Key insight: </span>{details.insight}</div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr>{headings(active.id).map(heading => <th className="px-5 py-3" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={cellIndex} className={`px-5 py-4 ${cellIndex === 0 ? "font-medium text-slate-900" : "text-slate-700"}`}>{cell}</td>)}</tr>)}</tbody></table></div>{!rows.length && <div className="p-10 text-center text-sm text-slate-500">No data is available for this report yet.</div>}</section>
  </div>;
}
