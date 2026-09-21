import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function AppShell({ children, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    setConfirmLogout(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(30,64,175,0.25),transparent_32%),linear-gradient(135deg,#eaf0f8_0%,#dce6f3_48%,#f3f6fb_100%)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} user={user} onLogout={() => setConfirmLogout(true)} />
      <div className="flex min-h-screen flex-col lg:pl-28">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} className="ml-4 mt-4 rounded-xl bg-[#06162d] p-3 text-white lg:hidden">
          <Menu size={22} />
        </button>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <Footer />
      </div>
      {confirmLogout && (
        <div className="logout-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLogout(false); }}>
          <div className="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" onKeyDown={(event) => { if (event.key === "Escape") setConfirmLogout(false); }}>
            <button type="button" className="logout-modal-close" onClick={() => setConfirmLogout(false)} aria-label="Close confirmation"><X size={20} /></button>
            <div className="logout-modal-icon"><LogOut size={26} aria-hidden="true" /></div>
            <p className="logout-modal-eyebrow">Sign out</p>
            <h2 id="logout-title">End your session?</h2>
            <p id="logout-description">You will need to sign in again to access the dashboard.</p>
            <div className="logout-modal-actions">
              <button type="button" className="logout-cancel" onClick={() => setConfirmLogout(false)} autoFocus>Cancel</button>
              <button type="button" className="logout-confirm" onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
