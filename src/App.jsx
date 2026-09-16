import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Institutions from "./pages/Institutions";
import Childcare from "./pages/Childcare";
import SoloParents from "./pages/SoloParents";
import Geographic from "./pages/Geographic";
import OCC from "./pages/OCC";
import SurveyResponses from "./pages/SurveyResponses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AppShell>
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
    </AppShell>
  );
}
