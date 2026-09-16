export default function Loading({ label = "Loading..." }) {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
        {label}
      </div>
    </div>
  );
}
