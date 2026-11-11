import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy URL: visitors go straight to the dashboard, without a login screen. */
export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta:[{ title:"Skinão Veículos | Acesso ao painel" },{ name:"description",content:"Acesso direto ao painel Skinão Veículos." },{ property:"og:title",content:"Skinão Veículos | Acesso ao painel" },{ property:"og:description",content:"Acesso ao painel de veículos Skinão." },{ property:"og:type",content:"website" },{ name:"twitter:card",content:"summary" },{ name:"robots",content:"noindex,nofollow" }] }),
  component: () => <Navigate to="/admin" replace />,
});
