import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(30,64,175,0.25),transparent_32%),linear-gradient(135deg,#eaf0f8_0%,#dce6f3_48%,#f3f6fb_100%)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-28">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} className="ml-4 mt-4 rounded-xl bg-[#06162d] p-3 text-white lg:hidden">
          <Menu size={22} />
        </button>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
