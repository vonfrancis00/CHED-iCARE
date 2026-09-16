import { FileText, BarChart3, Users, Map } from "lucide-react";

const reports = [
  ["Executive Summary","Management overview of facilities, programs, and solo parent statistics.",FileText],
  ["Regional Report","Institution and facility distribution by region.",Map],
  ["Solo Parent Report","Campus and community solo parent statistics.",Users],
  ["Facility & Program Report","Facility availability and documented program readiness.",BarChart3]
];

export default function Reports() {
  return <div><h1 className="page-title">Reports</h1><p className="mt-1 text-sm text-slate-500">Report modules prepared for future PDF/Excel export.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{reports.map(([title,text,Icon])=><div className="card p-6" key={title}><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={21}/></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p><button className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Open report</button></div>)}</div></div>;
}
