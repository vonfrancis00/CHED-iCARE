export default function PairedStatCard({ metrics }) {
  return (
    <div className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid gap-5 min-[480px]:grid-cols-2">
        {metrics.map(({ label, value, icon: Icon, tone }, index) => (
          <div key={label} className={index ? "border-t border-slate-200 pt-5 min-[480px]:border-l min-[480px]:border-t-0 min-[480px]:pl-5 min-[480px]:pt-0" : undefined}>
            <div className={`mb-3 inline-flex rounded-xl p-3 ${tone}`}><Icon size={20} /></div>
            <p className="min-h-10 text-center text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">{Number(value || 0).toLocaleString()}</p>
            <p className="mt-2 text-center text-xs text-slate-500">No. of "Yes" Responses</p>
          </div>
        ))}
      </div>
    </div>
  );
}
