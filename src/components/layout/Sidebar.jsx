import { accountFetch } from "../../services/accountApi";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Baby, BarChart3, BriefcaseBusiness, Building2, ChevronRight, Clock3, FileText, LogOut, Map, Pin, PinOff, RefreshCw, Settings, Users, X } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";

const navGroups = [
  {
    label: "Overview",
    items: [["Dashboard", "/", BarChart3, "Live Summary"]]
  },
  {
    label: "Monitoring",
    items: [
      ["Institutions", "/institutions", Building2, "Colleges and Universities"],
      ["Childcare", "/childcare", Baby, "Facilities & Programs"],
      ["Solo Parents", "/solo-parents", Users, "Beneficiaries"],
      ["Regional Geographic", "/geographic", Map, "Overview"],
      ["OCC / Office", "/occ", BriefcaseBusiness, "Office Comparison"]
    ]
  },
  {
    label: "Records",
    items: [
      ["Reports", "/reports", FileText, "Exports"]
    ]
  }
];


function SidebarLink({ item: [label, path, Icon, description], onClose, hasNotification = false }) {
  const handleClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    onClose();
  };

  return (
    <NavLink to={path} end={path === "/"} onClick={handleClick} title={label} aria-label={hasNotification ? `${label}: new access request` : label}
      className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}>
      <span className="sidebar-icon"><Icon size={22} aria-hidden="true" /></span>
      <span className="sidebar-label sidebar-link-copy">
        <span className="sidebar-link-title">{label}{hasNotification && <span className="sidebar-notification-dot" aria-hidden="true" />}</span>
        {description && <small>{description}</small>}
      </span>
      <ChevronRight className="sidebar-label sidebar-chevron" size={16} aria-hidden="true" />
    </NavLink>
  );
}

function SidebarUpdateStatus() {
  const { data, refreshing, error, reload } = useDashboard();
  const updatedAt = data?.cachedAt || data?.updatedAt;
  const date = updatedAt ? new Date(updatedAt) : null;
  const validDate = date && !Number.isNaN(date.getTime());
  const label = validDate ? date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Awaiting first update";

  return (
    <div className={`sidebar-update-status${error ? " has-error" : ""}`}>
      <Clock3 size={17} aria-hidden="true" className="sidebar-update-icon" />
      <div className="sidebar-label sidebar-update-copy">
        <span aria-live="polite">{refreshing ? "Refreshing data" : error ? "Refresh unavailable" : "Last updated"}</span>
        <time dateTime={validDate ? date.toISOString() : undefined} title={validDate ? date.toLocaleString() : undefined}>{label}</time>
      </div>
      <button type="button" onClick={() => reload({ force: true })} disabled={refreshing} aria-label="Refresh dashboard data" title="Refresh dashboard data" className="sidebar-refresh">
        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Sidebar({ mobileOpen, pinned, onTogglePin, onClose, user, onLogout }) {
  const [hasAccountRequests, setHasAccountRequests] = useState(false);
  const accountName = user.name || user.email || "Administrator";
  const initials = accountName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

  useEffect(() => {
    if (user?.role !== "super_admin") {
      setHasAccountRequests(false);
      return undefined;
    }

    const controller = new AbortController();
    let checking = false;
    const checkRequests = async () => {
      if (checking || document.visibilityState === 'hidden' || !navigator.onLine) return;
      checking = true;
      try {
        const response = await accountFetch("/api/sheet?action=listAccountRequests", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal
        });
        const result = await response.json();
        if (!controller.signal.aborted && response.ok && result.success) setHasAccountRequests((result.requests || []).length > 0);
      } catch (error) {
        // Keep the last known notification during a temporary service failure.
      } finally { checking = false; }
    };

    checkRequests();
    const interval = window.setInterval(checkRequests, 60000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [user?.role]);

  const navigationGroups = navGroups.map(group => ({
    ...group,
    items: group.items.map(item => item[1] === "/occ" && user?.role === "admin"
      ? ["My Office", item[1], item[2], "Your office assignments"]
      : item)
  }));

  return (
    <>
      {mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside id="main-sidebar" aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} className={`sidebar${mobileOpen ? " is-mobile-open" : ""}${pinned ? " is-pinned" : ""}`}>
        <header className="sidebar-brand">
          <img src="/ched-logo.png" alt="CHED logo" />
          <div className="sidebar-label sidebar-brand-copy"><small>CHED iCARE Program</small><strong>Monitoring Dashboard</strong></div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
        </header>
        <button type="button" className="sidebar-pin" onClick={onTogglePin} aria-pressed={pinned} title={pinned ? "Unpin sidebar" : "Keep sidebar open"} aria-label={pinned ? "Unpin sidebar" : "Keep sidebar open"}>
          {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
          <span className="sidebar-label">{pinned ? "Unpin navigation" : "Keep navigation open"}</span>
        </button>
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {navigationGroups.map((group) => (
            <section className="sidebar-section" key={group.label} aria-label={group.label}>
              <div className="sidebar-section-title sidebar-label">{group.label}</div>
              {group.items.map((item) => <SidebarLink key={item[1]} item={item} onClose={onClose} />)}
              {group.label === "Records" && user.role === "super_admin" && <SidebarLink item={["Settings", "/settings", Settings, "Accounts & access"]} onClose={onClose} hasNotification={hasAccountRequests} />}
            </section>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <SidebarUpdateStatus />
          <div className="sidebar-account" title={`${accountName}${user.office ? ` ? ${user.office}` : ""}`}>
            <span className="sidebar-account-avatar" aria-hidden="true">{initials}</span>
            <div className="sidebar-label sidebar-account-copy">
              <strong>{accountName}</strong>
              <span>{user.role === "super_admin" ? "Super Admin" : "Admin"}</span>
              {user.office && <span>{user.office}</span>}
            </div>
          </div>
          <button type="button" onClick={onLogout} className="sidebar-signout" aria-label="Log out" title="Log out">
            <span className="sidebar-signout-icon"><LogOut size={18} aria-hidden="true" /></span>
            <span className="sidebar-label">Log Out</span>
          </button>
        </footer>
      </aside>
    </>
  );
}
