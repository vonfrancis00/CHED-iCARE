import ChartCard from "./ChartCard";

export default function OCCChart({ data = [], total = 0, average = 0 }) {
  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 0);

  return (
    <ChartCard
      title="Assigned Institutions by OCC / Office"
      subtitle="Ranked distribution of all institutions listed in the Per OCC sheet"
      className="p-0"
    >
      <div className="border-b border-slate-100 px-5 pb-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{total.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Peak</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{maxValue.toLocaleString()}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Average</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{average.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {data.map((item, index) => {
          const value = Number(item.value) || 0;
          const widthPercent = maxValue ? Math.max((value / maxValue) * 100, 3) : 0;
          const share = total ? (value / total) * 100 : 0;
          const averagePercent = maxValue ? Math.min((average / maxValue) * 100, 100) : 0;

          return (
            <div
              key={item.name}
              className="grid gap-4 px-5 py-4 lg:grid-cols-[44px_minmax(240px,360px)_1fr_92px] lg:items-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold tabular-nums text-slate-600">
                {index + 1}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug text-slate-900">
                  {item.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {share.toFixed(1)}% of assigned institutions
                </div>
              </div>

              <div className="relative min-w-0">
                <div className="h-8 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="h-full rounded-md bg-teal-700"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                {averagePercent > 0 && (
                  <div
                    className="absolute inset-y-0 w-px bg-amber-500"
                    style={{ left: `${averagePercent}%` }}
                    title="Average assignment count"
                  />
                )}
              </div>

              <div className="text-left lg:text-right">
                <div className="text-xl font-bold tabular-nums text-slate-900">
                  {value.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-slate-400">
                  assigned
                </div>
              </div>
            </div>
          );
        })}

        {!data.length && (
          <div className="p-10 text-center text-sm text-slate-500">
            No OCC / Office assignments found.
          </div>
        )}
      </div>

      {!!data.length && (
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-teal-700" />
            Assigned count
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-px bg-amber-500" />
            Average marker
          </div>
        </div>
      )}
    </ChartCard>
  );
}
