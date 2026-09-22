import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Loading from "./components/common/Loading";
import Login from "./pages/Login";
import { getInstitutions } from "./services/api";

const loadInstitutions = () => import("./pages/Institutions");
const loadSurveyResponses = () => import("./pages/SurveyResponses");

function prefetchRecords() {
  // Match both pages' initial pagination. The API shares cached and in-flight
  // requests, including when a user opens a page before this finishes.
  void getInstitutions({ page: 1, pageSize: 20, query: "", institutionType: "", region: "" }).catch(() => {});
}

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Institutions = lazy(loadInstitutions);
const Childcare = lazy(() => import("./pages/Childcare"));
const SoloParents = lazy(() => import("./pages/SoloParents"));
const Geographic = lazy(() => import("./pages/Geographic"));
const OCC = lazy(() => import("./pages/OCC"));
const SurveyResponses = lazy(loadSurveyResponses);
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

export default function App() {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();
  useEffect(() => {
    // Download page code during session checking/login without fetching records.
    // A failed preload must not block sign-in or the later route import.
    void Promise.allSettled([loadInstitutions(), loadSurveyResponses()]);
    fetch('/api/sheet?action=session', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => response.json()).then(result => {
        if (result.user) prefetchRecords();
        setUser(result.user || null);
      }).catch(() => setUser(null));
  }, []);
  useEffect(() => {
    if (user !== null) return;
    // Warm server memory while the user types; records stay behind login.
    void fetch('/api/sheet?action=prepareRecords', { credentials: 'same-origin', cache: 'no-store' }).catch(() => {});
  }, [user]);
  if (user === undefined) return <Loading label="Checking session..." />;
  if (!user) return <Login onLogin={(signedInUser) => {
    prefetchRecords();
    setUser(signedInUser);
    navigate("/", { replace: true });
  }} />;
  return (
    <Suspense fallback={<Loading label="Loading dashboard..." />}>
        <Routes>
          <Route path="/*" element={<AppShell user={user} onLogout={() => {
            fetch('/api/sheet?action=logout', { method: 'POST' }).finally(() => setUser(null));
          }}><Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/institutions" element={<Institutions />} />
            <Route path="/childcare" element={<Childcare />} />
            <Route path="/solo-parents" element={<SoloParents />} />
            <Route path="/geographic" element={<Geographic />} />
            <Route path="/occ" element={<OCC user={user} />} />
            <Route path="/responses" element={<SurveyResponses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={user.role === "super_admin" ? <Settings user={user} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></AppShell>} />
        </Routes>
    </Suspense>
  );
}
