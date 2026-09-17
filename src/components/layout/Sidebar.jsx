import { NavLink } from "react-router-dom";
import { Baby, BarChart3, BriefcaseBusiness, Building2, ChevronRight, ClipboardList, Clock3, FileText, Map, RefreshCw, Settings, Users, X } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";

const navGroups = [
  {
    label: "Overview",
    items: [["Dashboard", "/", BarChart3, "Live summary"]]
  },
  {
    label: "Monitoring",
    items: [
      ["Institutions", "/institutions", Building2, "Colleges and Universities"],
      ["Childcare", "/childcare", Baby, "Facilities"],
      ["Solo Parents", "/solo-parents", Users, "Beneficiaries"],
      ["Geographic", "/geographic", Map, "Regional view"],
      ["OCC / Office", "/occ", BriefcaseBusiness, "Office comparison"]
    ]
  },
  {
    label: "Records",
    items: [
      ["Survey Responses", "/responses", ClipboardList, "Submissions"],
      ["Reports", "/reports", FileText, "Exports"]
    ]
  }
];


function SidebarLink({ item: [label, path, Icon, description], onClose }) {
  const handleClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    onClose();
  };

  return (
    <NavLink to={path} end={path === "/"} onClick={handleClick} aria-label={label}
      className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}>
      <span className="sidebar-icon"><Icon size={22} aria-hidden="true" /></span>
      <span className="sidebar-label sidebar-link-copy">
        <span>{label}</span>
        {description && <small>{description}</small>}
      </span>
      <ChevronRight className="sidebar-label sidebar-chevron" size={16} aria-hidden="true" />
    </NavLink>
  );
}

function SidebarUpdateStatus() {
  const { data, refreshing, reload } = useDashboard();
  const updatedAt = data?.cachedAt || data?.updatedAt;
  const label = updatedAt ? new Date(updatedAt).toLocaleString() : "Checking for updates";

  return (
    <div className="sidebar-update-status">
      <Clock3 size={17} aria-hidden="true" className="sidebar-update-icon" />
      <div className="sidebar-label sidebar-update-copy">
        <span>Last updated</span>
        <time dateTime={updatedAt || undefined}>{label}</time>
      </div>
      <button type="button" onClick={() => reload({ force: true })} disabled={refreshing} aria-label="Refresh dashboard data" title="Refresh dashboard data" className="sidebar-refresh">
        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
        <span className="sidebar-label">Refresh</span>
      </button>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside id="main-sidebar" aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} className={`sidebar${mobileOpen ? " is-mobile-open" : ""}`}>
        <header className="sidebar-brand">
          <img src="/ched-logo.png" alt="CHED logo" />
          <div className="sidebar-label sidebar-brand-copy"><small>CHED iCARE Program</small><strong>Monitoring Dashboard</strong></div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
        </header>
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {navGroups.map((group) => (
            <section className="sidebar-section" key={group.label} aria-label={group.label}>
              <div className="sidebar-section-title sidebar-label">{group.label}</div>
              {group.items.map((item) => <SidebarLink key={item[1]} item={item} onClose={onClose} />)}
            </section>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <SidebarUpdateStatus />
          <SidebarLink item={["Settings", "/settings", Settings]} onClose={onClose} />
        </footer>
      </aside>
    </>
  );
}
