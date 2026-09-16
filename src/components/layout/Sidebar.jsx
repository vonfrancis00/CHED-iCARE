import { NavLink } from "react-router-dom";
import { Baby, BarChart3, BriefcaseBusiness, Building2, ChevronRight, ClipboardList, FileText, Map, Settings, Users, X } from "lucide-react";

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
  return (
    <NavLink to={path} end={path === "/"} onClick={onClose} aria-label={label}
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

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside id="main-sidebar" aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} className={`sidebar${mobileOpen ? " is-mobile-open" : ""}`}>
        <header className="sidebar-brand">
          <img src="/ched-logo.png" alt="CHED logo" />
          <div className="sidebar-label sidebar-brand-copy"><small>CHED Monitoring</small><strong>Childcare Dashboard</strong></div>
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
          <SidebarLink item={["Settings", "/settings", Settings]} onClose={onClose} />
        </footer>
      </aside>
    </>
  );
}
