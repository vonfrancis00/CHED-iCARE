export default function ChartCard({ title, subtitle, headerContent, children, className = "" }) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      <div className={`mb-5 ${headerContent ? "w-fit max-w-full" : ""}`}>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {headerContent}
      </div>
      {children}
    </section>
  );
}
