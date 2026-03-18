import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAuthState } from "../lib/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const auth = getAuthState();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
