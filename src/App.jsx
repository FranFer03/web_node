import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import HistoricalDashboardPage from "./pages/HistoricalDashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import NodesManagerPage from "./pages/NodesManagerPage";
import NodesVisualizerPage from "./pages/NodesVisualizerPage";
import PacketLogsPage from "./pages/PacketLogsPage";
import { ThemeLangProvider } from "./contexts/ThemeLangContext";

export default function App() {
  return (
    <ThemeLangProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<HistoricalDashboardPage />} />
            <Route path="/nodes-visualizer" element={<NodesVisualizerPage />} />
            <Route path="/nodes-manager" element={<NodesManagerPage />} />
            <Route path="/packet-logs" element={<PacketLogsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeLangProvider>
  );
}
