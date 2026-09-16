import { Building2 } from "lucide-react";

function normalizeInstitution(institution) {
  if (typeof institution === "string") {
    return { name: institution, responded: null };
  }
  return institution || { name: "-", responded: null };
}

export default function OCCOfficeList({ offices = [] }) {
  return (
    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 className="font-semibold text-slate-900">Institution List by Office</h2>
        <p className="mt-1 text-xs text-slate-500">
          Green institutions have checked Survey boxes; red institutions have not responded yet
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {offices.map((office, officeIndex) => {
          const institutions = (office.institutions || []).map(normalizeInstitution);
          const responded = office.responded ?? institutions.filter((item) => item.responded === true).length;
          const pending = office.pending ?? institutions.filter((item) => item.responded === false).length;
          const hasStatus = institutions.some((item) => item.responded !== null);

          return (
            <details key={`${office.name}-${officeIndex}`} className="group open:bg-slate-50/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-slate-50">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Building2 size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold leading-snug text-slate-900">{office.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="text-slate-500">
                        {(institutions.length || office.value || 0).toLocaleString()} assigned
                      </span>
                      {hasStatus && (
                        <>
                          <span className="font-semibold text-emerald-700">{responded.toLocaleString()} responded</span>
                          <span className="font-semibold text-red-700">{pending.toLocaleString()} not responded</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-teal-700 group-open:hidden">View</div>
                <div className="hidden text-sm font-semibold text-slate-500 group-open:block">Hide</div>
              </summary>

              <div className="px-5 pb-5">
                {institutions.length ? (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {institutions.map((institution, institutionIndex) => {
                      const respondedClass = institution.responded === true
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : institution.responded === false
                          ? "border-red-200 bg-red-50 text-red-900"
                          : "border-slate-200 bg-white text-slate-700";
                      const statusClass = institution.responded === true
                        ? "bg-emerald-600 text-white"
                        : institution.responded === false
                          ? "bg-red-600 text-white"
                          : "bg-slate-200 text-slate-600";
                      const statusText = institution.responded === true
                        ? "Responded"
                        : institution.responded === false
                          ? "No response"
                          : "Status pending";

                      return (
                        <div
                          key={`${institution.name}-${institutionIndex}`}
                          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${respondedClass}`}
                        >
                          <span className="leading-snug">{institution.name}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                            {statusText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    Redeploy the Apps Script and clear the dashboard cache to show every institution for this office.
                  </div>
                )}
              </div>
            </details>
          );
        })}

        {!offices.length && (
          <div className="p-10 text-center text-sm text-slate-500">
            No OCC / Office assignments found.
          </div>
        )}
      </div>
    </section>
  );
}
