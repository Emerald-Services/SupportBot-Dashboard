import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { useSetup } from "./context/SetupContext";
import Configs from "./pages/Configs";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import { HomeRedirect } from "./components/home-redirect";
import { RequirePermission } from "./components/require-permission";
import Addons from "./pages/Addons";
import { AddonBuilder } from "@/pages/AddonBuilder";
import { DashboardSettings } from "@/pages/DashboardSettings";
import Settings from "./pages/Settings";
import SystemDetails from "./pages/SystemDetails";
import Logs from "./pages/Logs";
import Transcripts from "./pages/Transcripts";
import Users from "./pages/Users";

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { complete, loading } = useSetup();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!complete) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  if (location.pathname === "/setup") {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route
          path="system"
          element={
            <RequirePermission permission="overview">
              <SystemDetails />
            </RequirePermission>
          }
        />
        <Route
          path="settings"
          element={
            <RequirePermission permission="settings.view">
              <Settings />
            </RequirePermission>
          }
        />
        <Route path="configs" element={<Configs />} />
        <Route
          path="logs"
          element={
            <RequirePermission permission="logs">
              <Logs />
            </RequirePermission>
          }
        />
        <Route
          path="transcripts"
          element={
            <RequirePermission permission="transcripts">
              <Transcripts />
            </RequirePermission>
          }
        />
        <Route
          path="users"
          element={
            <RequirePermission permission="users.view">
              <Users />
            </RequirePermission>
          }
        />
        <Route
          path="addons"
          element={
            <RequirePermission permission="settings.view">
              <Addons />
            </RequirePermission>
          }
        />
        <Route
          path="addons/builder"
          element={
            <RequirePermission permission="settings.update">
              <AddonBuilder />
            </RequirePermission>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
