import { useSession, getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { neonTransport } from "./skinaoNeonTransport.server";

/** Sessions store only an opaque database user ID and a revocable version. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function adminSession(secret: string) {
  setResponseHeader("Cache-Control", "no-store");
  return useSession<{ adminId?:string; credentialVersion?:number }>({
    password:secret,
    name:"skinao-admin",
    maxAge:ADMIN_SESSION_MAX_AGE_SECONDS,
    cookie:{
      httpOnly:true,
      secure:new URL(getRequest().url).protocol === "https:",
      sameSite:"strict",
      path:"/",
    },
  });
}

export async function requireAdmin(secret: string | undefined) {
  if (!secret || !process.env["DATABASE_URL"])
    throw new Error("Acesso administrativo indisponível.");
  const session = await adminSession(secret);
  const adminId = session.data.adminId;
  const version = Number(session.data.credentialVersion);
  if (!adminId || !/^[a-f0-9-]{36}$/i.test(adminId) || !Number.isSafeInteger(version) || version < 1)
    throw new Error("Sessão encerrada. Faça login novamente.");
  const results = await neonTransport([{
    query:"SELECT id,credential_version FROM skinao_admin_users WHERE id=$1 AND is_active=true",
    params:[adminId],
  }],false);
  const user = results[0]?.rows[0];
  if (!user || Number(user.credential_version) !== version)
    throw new Error("Sua sessão expirou ou foi revogada. Faça login novamente.");
  return session;
}
