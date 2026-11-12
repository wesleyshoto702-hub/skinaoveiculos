import { createHash, randomBytes } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { neonTransport } from "./skinaoNeonTransport.server";

/**
 * Opaque server-side sessions.
 * The browser gets a random 256-bit cookie, never the database token hash or
 * account metadata. Every protected write validates the token in Neon.
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const COOKIE_NAME = "__Host-skinao-admin";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const COOKIE_OPTIONS = {
  httpOnly:true,
  secure:true,
  sameSite:"strict" as const,
  path:"/",
};

export type AdminSessionData = { adminId:string; credentialVersion:number };
export type AdminSession = { data:AdminSessionData };

function tokenHash(token:string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId:string, credentialVersion:number) {
  if (!process.env["DATABASE_URL"]) throw new Error("Banco indisponível.");
  const token=randomBytes(32).toString("hex");
  await neonTransport([{
    query:`INSERT INTO skinao_admin_sessions (token_hash,admin_id,credential_version,expires_at)
      VALUES($1,$2,$3,now()+interval '7 days')`,
    params:[tokenHash(token),adminId,credentialVersion],
  }],true);
  setCookie(COOKIE_NAME,token,{
    ...COOKIE_OPTIONS,
    maxAge:ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function requireAdmin(_legacySecret?:string):Promise<AdminSession> {
  if (!process.env["DATABASE_URL"]) throw new Error("Acesso administrativo indisponível.");
  const token=getCookie(COOKIE_NAME);
  if (!token || !TOKEN_PATTERN.test(token))
    throw new Error("Sessão encerrada. Faça login novamente.");
  const result=await neonTransport([{
    query:`SELECT u.id,u.credential_version
           FROM skinao_admin_sessions s
           JOIN skinao_admin_users u ON u.id=s.admin_id
           WHERE s.token_hash=$1
             AND s.expires_at>now()
             AND u.is_active=true
             AND s.credential_version=u.credential_version
           LIMIT 1`,
    params:[tokenHash(token)],
  }],false);
  const row=result[0]?.rows[0];
  if (!row) throw new Error("Sessão expirada ou revogada. Faça login novamente.");
  return {data:{
    adminId:String(row.id),
    credentialVersion:Number(row.credential_version),
  }};
}

export async function revokeAdminSession() {
  const token=getCookie(COOKIE_NAME);
  if (token && TOKEN_PATTERN.test(token) && process.env["DATABASE_URL"]) {
    await neonTransport([{
      query:"DELETE FROM skinao_admin_sessions WHERE token_hash=$1",
      params:[tokenHash(token)],
    }],true);
  }
  deleteCookie(COOKIE_NAME,COOKIE_OPTIONS);
}

/** Only the principal administrator may manage staff accounts. */
export async function requireOwner(_legacySecret?:string) {
  const session=await requireAdmin();
  const actorId=session.data.adminId;
  const result=await neonTransport([{
    query:"SELECT role FROM skinao_admin_users WHERE id=$1 AND is_active=true",
    params:[actorId],
  }],false);
  if (result[0]?.rows[0]?.role!=="owner")
    throw new Error("Apenas o administrador principal pode gerenciar a equipe.");
  return session;
}
