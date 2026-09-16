export default function EmptyState({ title = "No data", text = "There are no records to display." }) {
  return <div className="card p-10 text-center"><div className="font-semibold">{title}</div><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}
