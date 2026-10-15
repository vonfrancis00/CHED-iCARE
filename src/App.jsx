import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Loading from "./components/common/Loading";
import Login from "./pages/Login";
import AppErrorBoundary from "./components/common/AppErrorBoundary";

const loadInstitutions = () => import("./pages/Institutions");
const loadDashboard = () => import("./pages/Dashboard");

const Dashboard = lazy(loadDashboard);
const Institutions = lazy(loadInstitutions);
const Childcare = lazy(() => import("./pages/Childcare"));
const SoloParents = lazy(() => import("./pages/SoloParents"));
const Geographic = lazy(() => import("./pages/Geographic"));
const OCC = lazy(() => import("./pages/OCC"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

export default function App() {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();
  useEffect(() => {
    // Warm the landing page while signing in, without fetching private data.
    void loadDashboard().catch(() => {});
    const controller = new AbortController();
    fetch('/api/sheet?action=session', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(response => response.json()).then(result => {
        if (!controller.signal.aborted) setUser(result.user || null);
      }).catch(() => { if (!controller.signal.aborted) setUser(null); });
    return () => controller.abort();
  }, []);
  // Fetch records after authentication so a cold data load does not compete
  // with the user's first sign-in request.
  if (user === undefined) return <Loading label="Checking session..." />;
  if (!user) return <Login onLogin={(signedInUser) => {
    setUser(signedInUser);
    navigate("/", { replace: true });
  }} />;
  return (
    <AppErrorBoundary>
    <Suspense fallback={<Loading label="Loading dashboard..." />}>
        <Routes>
          <Route path="/*" element={<AppShell user={user} onLogout={() => {
            void fetch('/api/sheet?action=logout', { method: 'POST', credentials: 'same-origin' }).then(response => {
              if (!response.ok) throw new Error('Sign-out failed. Please retry.');
              // Discard browser snapshots and all module caches between accounts.
              try {
                for (const key of Object.keys(window.localStorage)) {
                  if (key.startsWith('childcare-dashboard:') || key.startsWith('childcare-institution-groups:')) window.localStorage.removeItem(key);
                }
              } catch { /* Storage may be unavailable. */ }
              window.location.replace('/');
            }).catch(() => window.alert('Sign-out could not be confirmed. Please retry.'));
          }}><Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/institutions" element={<Institutions />} />
            <Route path="/childcare" element={<Childcare />} />
            <Route path="/solo-parents" element={<SoloParents />} />
            <Route path="/geographic" element={<Geographic />} />
            <Route path="/occ" element={<OCC user={user} />} />
            <Route path="/reports" element={<Reports user={user} />} />
            <Route path="/settings" element={user.role === "super_admin" ? <Settings user={user} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></AppShell>} />
        </Routes>
    </Suspense>
    </AppErrorBoundary>
  );
}
