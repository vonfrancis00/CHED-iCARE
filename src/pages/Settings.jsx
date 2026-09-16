export default function Settings() {
  return <div><h1 className="page-title">Settings</h1><p className="mt-1 text-sm text-slate-500">Environment and dashboard configuration.</p><div className="card mt-6 p-6"><h2 className="font-semibold">Data Source</h2><p className="mt-2 text-sm text-slate-500">Set <code className="rounded bg-slate-100 px-1">VITE_SHEET_API_URL</code> in your .env file to connect the React app to Google Apps Script.</p></div></div>;
}
