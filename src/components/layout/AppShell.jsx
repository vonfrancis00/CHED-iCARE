import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function AppShell({ children, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = document.getElementById("main-sidebar");
    const content = contentRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    content.inert = true;
    sidebar.querySelector("button").focus();
    const handleKey = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const focusable = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')].filter(element => element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    document.addEventListener("keydown", handleKey);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      content.inert = false;
      document.removeEventListener("keydown", handleKey);
      desktop.removeEventListener("change", closeOnDesktop);
      menuRef.current?.focus();
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    setConfirmLogout(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(30,64,175,0.25),transparent_32%),linear-gradient(135deg,#eaf0f8_0%,#dce6f3_48%,#f3f6fb_100%)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user} onLogout={() => { setMobileOpen(false); setConfirmLogout(true); }} />
      <div ref={contentRef} className="flex min-h-screen min-w-0 flex-col lg:pl-28">
        <header className="mobile-app-header sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
          <button ref={menuRef} type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-controls="main-sidebar" aria-expanded={mobileOpen} className="shrink-0 rounded-xl bg-[#06162d] p-3 text-white">
            <Menu size={22} />
          </button>
          <div className="min-w-0 text-sm font-bold text-[#0b2c5b]">CHED iCARE<p className="text-xs font-normal text-slate-500">Monitoring Dashboard</p></div>
        </header>
        <main className="app-content mx-auto w-full min-w-0 max-w-[1600px] flex-1 p-3 sm:p-6 lg:p-8">{children}</main>
        <Footer />
      </div>
      {confirmLogout && (
        <div className="logout-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLogout(false); }}>
          <div className="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" onKeyDown={(event) => { if (event.key === "Escape") setConfirmLogout(false); }}>
            <button type="button" className="logout-modal-close" onClick={() => setConfirmLogout(false)} aria-label="Close confirmation"><X size={20} /></button>
            <div className="logout-modal-icon"><LogOut size={26} aria-hidden="true" /></div>
            <p className="logout-modal-eyebrow">Log out</p>
            <h2 id="logout-title">End your session?</h2>
            <p id="logout-description">You will need to sign in again to access the dashboard.</p>
            <div className="logout-modal-actions">
              <button type="button" className="logout-cancel" onClick={() => setConfirmLogout(false)} autoFocus>Cancel</button>
              <button type="button" className="logout-confirm" onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
