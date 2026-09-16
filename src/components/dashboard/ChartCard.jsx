export default function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
