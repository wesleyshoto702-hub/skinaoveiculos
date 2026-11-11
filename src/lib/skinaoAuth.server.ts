import { createHash, timingSafeEqual } from "node:crypto";
import { useSession, getRequest, setResponseHeader } from "@tanstack/react-start/server";

export function passwordMatches(input: string, expected: string | undefined) {
  if (!expected || !input || input.length > 1024) return false;
  return timingSafeEqual(createHash("sha256").update(input).digest(), createHash("sha256").update(expected).digest());
}
export async function adminSession(password: string) {
  setResponseHeader("Cache-Control", "no-store");
  return useSession<{ unlocked?: boolean; revision?: string }>({
    password, name: "skinao-admin", maxAge: 3600,
    cookie: { httpOnly: true, secure: new URL(getRequest().url).protocol === "https:", sameSite: "strict", path: "/" },
  });
}
export function authRevision(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
export async function requireAdmin(key: string | undefined, secret: string | undefined) {
  if (!key || !secret) throw new Error("Edição remota indisponível. Configure a autorização de administração.");
  const session = await adminSession(secret);
  if (!session.data.unlocked || !passwordMatches(session.data.revision ?? "", authRevision(key)))
    throw new Error("Edição bloqueada. Desbloqueie novamente no painel.");
  return session;
}