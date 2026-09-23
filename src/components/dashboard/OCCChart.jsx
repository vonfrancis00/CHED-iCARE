import ChartCard from "./ChartCard";

export default function OCCChart({ data = [] }) {
  const totalAssigned = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const totalResponded = data.reduce((sum, item) => sum + (Number(item.responded) || 0), 0);
  const overallProgress = totalAssigned ? (totalResponded / totalAssigned) * 100 : 0;
  const rankedData = [...data].sort((a, b) => {
    const assignedA = Number(a.value) || 0;
    const assignedB = Number(b.value) || 0;
    const progressA = assignedA ? Math.min((Number(a.responded) || 0) / assignedA, 1) : 0;
    const progressB = assignedB ? Math.min((Number(b.responded) || 0) / assignedB, 1) : 0;

    return progressB - progressA || String(a.name).localeCompare(String(b.name));
  });

  return (
    <ChartCard
      title="Survey Progress per OCC / Office"
      subtitle="Completed surveys compared with assigned institutions in each office"
      className="p-0"
    >
      <div className="border-b border-slate-100 px-5 pb-5">
        <div className="max-w-xs rounded-lg bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Overall progress</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{overallProgress.toFixed(1)}%</div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {rankedData.map((item, index) => {
          const assigned = Number(item.value) || 0;
          const responded = Number(item.responded) || 0;
          const progress = assigned ? Math.min((responded / assigned) * 100, 100) : 0;
          const completedDate = assigned > 0 && responded === assigned && item.completedAt
            ? new Date(item.completedAt)
            : null;
          const hasCompletedDate = completedDate && !Number.isNaN(completedDate.getTime());

          return (
            <div
              key={item.name}
              className="grid gap-4 px-5 py-4 lg:grid-cols-[36px_minmax(0,1fr)] 2xl:grid-cols-[36px_minmax(0,1fr)_minmax(60px,1fr)_64px] lg:items-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold tabular-nums text-slate-600">
                {index + 1}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug text-slate-900">
                  {item.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {responded.toLocaleString()} of {assigned.toLocaleString()} surveys completed
                </div>
                {hasCompletedDate && (
                  <time dateTime={item.completedAt} className="mt-1 block text-xs font-medium text-emerald-700">
                    Date completed: {completedDate.toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" })}
                  </time>
                )}
              </div>

              <div className="relative min-w-0">
                <div className="h-8 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="h-full rounded-md bg-teal-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="text-left lg:text-right">
                <div className="text-xl font-bold tabular-nums text-slate-900">
                  {progress.toFixed(0)}%
                </div>
                <div className="text-xs font-medium text-slate-400">
                  progress
                </div>
              </div>
            </div>
          );
        })}

        {!data.length && (
          <div className="p-10 text-center text-sm text-slate-500">
            No OCC / Office survey progress found.
          </div>
        )}
      </div>

      {!!data.length && (
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-teal-700" />
            Completed survey progress
          </div>
        </div>
      )}
    </ChartCard>
  );
}
