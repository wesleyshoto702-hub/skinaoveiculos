import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminSession, requireAdmin } from "../lib/skinaoAuth.server";
import { neonTransport } from "../lib/skinaoNeonTransport.server";

type Identity = { username:string; role:"owner"|"staff" };
const noCache = { "Cache-Control":"no-store, max-age=0", "Content-Type":"application/json; charset=utf-8" };

function json(value:unknown,status=200) {
  return Response.json(value,{status,headers:noCache});
}
function originAllowed(request:Request) {
  const origin=request.headers.get("origin");
  return Boolean(origin && origin===new URL(request.url).origin);
}
const schema=z.object({
  username:z.string().trim().min(1).max(100),
  password:z.string().min(1).max(1024),
}).strict();

export const Route=createFileRoute("/api/admin-auth")({
  server:{
    handlers:{
      GET:async () => {
        const secret=process.env["SKINAO_SESSION_SECRET"];
        const configured=Boolean(secret && process.env["DATABASE_URL"]);
        if (!configured) return json({configured:false,unlocked:false,account:null});
        try {
          const session=await requireAdmin(secret);
          const result=await neonTransport([{
            query:"SELECT username,role FROM skinao_admin_users WHERE id=$1 AND is_active=true",
            params:[session.data.adminId],
          }],false);
          const account=result[0]?.rows[0];
          if (!account || (account.role!=="owner" && account.role!=="staff"))
            return json({configured:true,unlocked:false,account:null});
          await session.update({
            adminId:session.data.adminId,
            credentialVersion:session.data.credentialVersion,
          });
          return json({configured:true,unlocked:true,
            account:{username:String(account.username),role:account.role as Identity["role"]}});
        } catch {
          // No valid session is expected before a user logs in.
          return json({configured:true,unlocked:false,account:null});
        }
      },
      POST:async ({request}) => {
        if (!originAllowed(request)) return json({ok:false,reason:"forbidden"},403);
        if (Number(request.headers.get("content-length")||0)>4000)
          return json({ok:false,reason:"invalid"},400);
        const secret=process.env["SKINAO_SESSION_SECRET"];
        if (!secret || !process.env["DATABASE_URL"])
          return json({ok:false,reason:"unavailable"},503);
        let body:unknown;
        try { body=await request.json(); }
        catch { return json({ok:false,reason:"invalid"},400); }
        const parsed=schema.safeParse(body);
        if (!parsed.success) return json({ok:false,reason:"invalid"},400);
        const username=parsed.data.username.toLowerCase();
        const password=parsed.data.password;
        const source=(request.headers.get("x-vercel-forwarded-for")
          || request.headers.get("x-real-ip")
          || request.headers.get("x-forwarded-for")
          || "unknown").split(",")[0].trim().slice(0,128);
        const fingerprint=createHash("sha256")
          .update(secret+":"+source+":"+username).digest("hex");

        let stage="rate-limit";
        try {
          const rate=await neonTransport([{
            query:`INSERT INTO skinao_admin_login_limits (fingerprint,attempt_count,window_started)
              VALUES ($1,1,now())
              ON CONFLICT (fingerprint) DO UPDATE
                SET attempt_count=CASE
                    WHEN skinao_admin_login_limits.window_started < now() - interval '15 minutes' THEN 1
                    ELSE skinao_admin_login_limits.attempt_count+1 END,
                  window_started=CASE
                    WHEN skinao_admin_login_limits.window_started < now() - interval '15 minutes' THEN now()
                    ELSE skinao_admin_login_limits.window_started END
              RETURNING attempt_count`,
            params:[fingerprint],
          }],true);
          const blocked=Number(rate[0]?.rows[0]?.attempt_count??99)>10;

          stage="verify-user";
          const user=await neonTransport([{
            query:`SELECT id,username,role,credential_version,
              password_hash=crypt($2,password_hash) AS valid
              FROM skinao_admin_users
              WHERE username=$1 AND is_active=true LIMIT 1`,
            params:[username,password],
          }],false);
          const account=user[0]?.rows[0];
          if (blocked || account?.valid!==true)
            return json({ok:false,reason:"invalid"},401);
          if (account.role!=="owner" && account.role!=="staff")
            return json({ok:false,reason:"invalid"},401);

          // Auditing is not security-critical; a transient failure must not lock
          // out a legitimate administrator whose password was already verified.
          stage="audit";
          try {
            await neonTransport([{
              query:"UPDATE skinao_admin_users SET last_login_at=now() WHERE id=$1",
              params:[account.id],
            }],true);
            await neonTransport([{
              query:"DELETE FROM skinao_admin_login_limits WHERE fingerprint=$1",
              params:[fingerprint],
            }],true);
          } catch { /* do not expose account credentials in logs */ }

          stage="session";
          const session=await adminSession(secret);
          await session.update({
            adminId:String(account.id),
            credentialVersion:Number(account.credential_version),
          });
          return json({ok:true,account:{
            username:String(account.username),role:account.role as Identity["role"],
          }});
        } catch (error) {
          // Record only the stage and error class: never SQL parameters or passwords.
          console.error("Skinão admin authentication failed",{
            stage,errorType:error instanceof Error?error.name:"UnknownError",
          });
          return json({ok:false,reason:"unavailable"},503);
        }
      },
      DELETE:async ({request}) => {
        if (!originAllowed(request)) return json({ok:false},403);
        const secret=process.env["SKINAO_SESSION_SECRET"];
        if (secret) {
          try { await (await adminSession(secret)).clear(); }
          catch { return json({ok:false},503); }
        }
        return json({ok:true});
      },
    },
  },
});
