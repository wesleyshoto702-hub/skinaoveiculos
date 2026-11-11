import { createFileRoute } from "@tanstack/react-router";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

/** Read-only dependency check. Never returns credentials, connection URLs or SQL errors. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        let database = false;
        let storage = false;

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
          { status: ready ? "ready" : "degraded", database, storage },
          { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
