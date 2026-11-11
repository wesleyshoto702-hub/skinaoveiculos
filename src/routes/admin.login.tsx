import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy URL: visitors go straight to the dashboard, without a login screen. */
export const Route = createFileRoute("/admin/login")({
  component: () => <Navigate to="/admin" replace />,
});
