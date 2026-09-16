import { useEffect, useState } from "react";
import { getSurveyResponses } from "../services/api";
import Loading from "../components/common/Loading";

let surveyResponsesCache = null;

const FIELD_MAP = {
  institution: "Name of Institution",
  campus: "Name of Institution Campus",
  address: "Address of Campus"
};

function display(value) {
  return value === "" || value == null ? "-" : String(value);
}

export default function SurveyResponses() {
  const [rows, setRows] = useState(surveyResponsesCache);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getSurveyResponses()
      .then((result) => {
        if (!active) return;
        const nextRows = Array.isArray(result.data) ? result.data : [];
        surveyResponsesCache = nextRows;
        setRows(nextRows);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Unable to load survey responses");
        if (!surveyResponsesCache) {
          setRows([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!rows) return <Loading label="Reading survey responses..." />;

  return (
    <div>
      <h1 className="page-title">Survey Responses</h1>
      <p className="mt-1 text-sm text-slate-500">
        Raw response explorer. Production version can expose all 31 mapped fields here.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Institution</th>
                <th className="px-5 py-3">Campus</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Facility</th>
                <th className="px-5 py-3">Program</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.rowNumber ?? index} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    {display(row[FIELD_MAP.institution])}
                  </td>
                  <td className="px-5 py-4">{display(row[FIELD_MAP.campus])}</td>
                  <td className="max-w-sm px-5 py-4">{display(row[FIELD_MAP.address])}</td>
                  <td className="px-5 py-4">{display(row.facilityStudents || row.facilityFaculty)}</td>
                  <td className="px-5 py-4">{display(row.programStudents || row.programFaculty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!rows.length && !error && (
          <div className="p-10 text-center text-sm text-slate-500">No survey responses found.</div>
        )}
      </div>
    </div>
  );
}
