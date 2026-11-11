import { createFileRoute } from "@tanstack/react-router";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

/** Read-only dependency check. Never returns credentials, connection URLs or SQL errors. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        let database = false;
        let storage = false;
        const authSteps: Record<string,boolean> = {
          requestContext:false, userRead:false, passwordFunction:false, rateWrite:false, rateConflict:false, passwordLookup:false, sessionRead:false, sessionWrite:false,
        };
        try {
          const { getRequest } = await import("@tanstack/react-start/server");
          authSteps.requestContext = Boolean(getRequest()?.headers);
        } catch {}
        if (process.env["DATABASE_URL"]) {
          try {
            const { neonTransport } = await import("../lib/skinaoNeonTransport.server");
            const r = await neonTransport([{
              query: "SELECT count(*) AS total FROM skinao_admin_users WHERE is_active=true",
            }],false);
            authSteps.userRead = Number(r[0]?.rows[0]?.total) > 0;
            const check = await neonTransport([{
              query: "SELECT length(crypt('check-value',password_hash))=60 AS valid FROM skinao_admin_users LIMIT 1",
            }],false);
            authSteps.passwordFunction = check[0]?.rows[0]?.valid === true;
            const { randomBytes } = await import("node:crypto");
            const fingerprint=randomBytes(32).toString("hex");
            const results=await neonTransport([
              {query:"INSERT INTO skinao_admin_login_limits(fingerprint,attempt_count,window_started) VALUES($1,1,now()) RETURNING attempt_count",params:[fingerprint]},
              {query:"DELETE FROM skinao_admin_login_limits WHERE fingerprint=$1 RETURNING fingerprint",params:[fingerprint]},
            ],true);
            authSteps.rateWrite = Number(results[0]?.rows[0]?.attempt_count)===1
              && results[1]?.rows[0]?.fingerprint===fingerprint;
            const conflictFingerprint=randomBytes(32).toString("hex");
            try {
              const insert = `INSERT INTO skinao_admin_login_limits (fingerprint,attempt_count,window_started)
                 VALUES ($1,1,now())
                 ON CONFLICT (fingerprint) DO UPDATE
                   SET attempt_count = CASE
                     WHEN skinao_admin_login_limits.window_started < now() - interval '15 minutes' THEN 1
                     ELSE skinao_admin_login_limits.attempt_count + 1 END,
                     window_started = CASE
                     WHEN skinao_admin_login_limits.window_started < now() - interval '15 minutes' THEN now()
                     ELSE skinao_admin_login_limits.window_started END
                 RETURNING attempt_count`;
              const first = await neonTransport([{query:insert,params:[conflictFingerprint]}],true);
              const second = await neonTransport([{query:insert,params:[conflictFingerprint]}],true);
              authSteps.rateConflict=Number(first[0]?.rows[0]?.attempt_count)===1
                && Number(second[0]?.rows[0]?.attempt_count)===2;
            } finally {
              await neonTransport([{query:"DELETE FROM skinao_admin_login_limits WHERE fingerprint=$1",params:[conflictFingerprint]}],true);
            }
            const lookup = await neonTransport([{
              query:"SELECT id,username,role,credential_version, (password_hash=crypt($2,password_hash)) AS valid FROM skinao_admin_users WHERE username=$1 AND is_active=true LIMIT 1",
              params:["adsestudos11@gmail.com", "dummy-pass-that-is-not-correct"],
            }],false);
            authSteps.passwordLookup=lookup[0]?.rows.length===1 && lookup[0]?.rows[0]?.valid===false;
            const { adminSession } = await import("../lib/skinaoAuth.server");
            const session = await adminSession(process.env["SKINAO_SESSION_SECRET"] || "not-a-real-secret");
            authSteps.sessionRead=Boolean(session && typeof session.update==="function");
            if (authSteps.sessionRead) {
              try {
                await session.update({});
                authSteps.sessionWrite=true;
              } catch(error) {
                console.error("Temporary empty-session write failed",error);
              }
            }

          } catch {}
        }

        if (process.env["DATABASE_URL"]) {
          try {
            const { neonTransport } = await import("../lib/skinaoNeonTransport.server");
            const result = await neonTransport([{ query: "SELECT 1 AS ready" }], false);
            database = Number(result[0]?.rows[0]?.ready) === 1;
          } catch {
            database = false;
          }
        }

        const endpoint = process.env["AWS_ENDPOINT_URL_S3"];
        const region = process.env["AWS_REGION"];
        const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
        const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];

        if (endpoint && region && accessKeyId && secretAccessKey) {
          const client = new S3Client({
            endpoint, region, forcePathStyle: true,
            credentials: { accessKeyId, secretAccessKey },
          });
          try {
            await client.send(new ListObjectsV2Command({
              Bucket: "vehicle-images",
              MaxKeys: 1,
            }));
            storage = true;
          } catch {
            storage = false;
          } finally {
            client.destroy();
          }
        }

        const ready = database && storage;
        return Response.json(
          { status: ready ? "ready" : "degraded", database, storage, authSteps },
          { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
