import { createFileRoute, Navigate } from "@tanstack/react-router";

/** The login form is part of the protected /admin experience. */
export const Route = createFileRoute("/admin/login")({
  component: () => <Navigate to="/admin" replace />,
});
