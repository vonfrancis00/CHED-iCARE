import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Loading from "./components/common/Loading";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Institutions = lazy(() => import("./pages/Institutions"));
const Childcare = lazy(() => import("./pages/Childcare"));
const SoloParents = lazy(() => import("./pages/SoloParents"));
const Geographic = lazy(() => import("./pages/Geographic"));
const OCC = lazy(() => import("./pages/OCC"));
const SurveyResponses = lazy(() => import("./pages/SurveyResponses"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading label="Loading dashboard..." />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/institutions" element={<Institutions />} />
          <Route path="/childcare" element={<Childcare />} />
          <Route path="/solo-parents" element={<SoloParents />} />
          <Route path="/geographic" element={<Geographic />} />
          <Route path="/occ" element={<OCC />} />
          <Route path="/responses" element={<SurveyResponses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
