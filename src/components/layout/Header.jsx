import { Menu, RefreshCw, Bell, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const titles = {
  "/": ["Dashboard", "Executive overview of childcare development survey responses"],
  "/institutions": ["Institutions", "Search and explore participating colleges and universities"],
  "/childcare": ["Childcare Facilities", "Facility availability, access, and program readiness"],
  "/solo-parents": ["Solo Parents", "Enrolled and community solo parent statistics"],
  "/geographic": ["Geographic Analysis", "Distribution of survey responses by region"],
  "/occ": ["OCC / Office", "Compare responses across assigned offices"],
  "/responses": ["Survey Responses", "Review the submitted survey records"],
  "/reports": ["Reports", "Management-ready reporting and exports"],
  "/settings": ["Settings", "Dashboard configuration"]
};

export default function Header({ onMenu }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [title, subtitle] = titles[location.pathname] || titles["/"];

  function handleLogout() {
    if (window.confirm("Are you sure you want to log out and end your session?")) logout();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-xl border border-slate-200 p-2 lg:hidden" onClick={onMenu}><Menu size={20}/></button>
          <div>
            <h1 className="font-bold text-slate-900">{title}</h1>
            <p className="hidden text-xs text-slate-500 sm:block">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw size={18}/></button>
          <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Bell size={18}/></button>
          <div className="hidden text-right sm:block"><p className="max-w-40 truncate text-xs font-semibold text-slate-700">{user?.email}</p><p className="text-[10px] text-slate-500">{user?.role}</p></div>
          <button type="button" onClick={handleLogout} aria-label="Sign out" title="Sign out" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><LogOut size={18}/></button>
        </div>
      </div>
    </header>
  );
}
