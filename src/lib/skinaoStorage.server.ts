import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { safeStoragePath } from "./skinaoInventoryRules";

export type StorageConfig = { endpoint: string; region: string; accessKeyId: string; secretAccessKey: string };
export const IMAGE_TYPES: Record<string,string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/avif":"avif" };
export function validateImage(bytes: Uint8Array, type: string) {
  if (!IMAGE_TYPES[type] || !bytes.length || bytes.length > 8*1024*1024) throw new Error("Use JPG, PNG, WebP ou AVIF até 8 MB.");
  const ascii = (a: number,b: number) => String.fromCharCode(...bytes.slice(a,b));
  const valid = type === "image/jpeg" ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 :
    type === "image/png" ? bytes[0]===137 && ascii(1,4)==="PNG" :
    type === "image/webp" ? ascii(0,4)==="RIFF" && ascii(8,12)==="WEBP" :
    ascii(4,8)==="ftyp" && /avif|avis/.test(ascii(8,32));
  if (!valid) throw new Error("O conteúdo do arquivo não corresponde ao formato de imagem.");
}
export function storage(config: StorageConfig) {
  if (!config.endpoint.startsWith("https://") || !config.region || !config.accessKeyId || !config.secretAccessKey) throw new Error("Armazenamento de fotos não configurado.");
  const client = new S3Client({ endpoint:config.endpoint, region:config.region, forcePathStyle:true,
    credentials: { accessKeyId:config.accessKeyId, secretAccessKey:config.secretAccessKey } });
  const Bucket = "vehicle-images";
  return {
    async upload(vehicleId: string, bytes: Uint8Array, type: string) {
      validateImage(bytes,type);
      const path = safeStoragePath(`vehicles/${vehicleId}/${crypto.randomUUID()}.${IMAGE_TYPES[type]}` ,vehicleId);
      await client.send(new PutObjectCommand({ Bucket, Key:path, Body:bytes, ContentType:type, CacheControl:"public,max-age=31536000,immutable" }));
      return path;
    },
    async verify(path: string, vehicleId: string) {
      const result = await client.send(new HeadObjectCommand({ Bucket, Key:safeStoragePath(path,vehicleId) }));
      if (!result.ContentType || !IMAGE_TYPES[result.ContentType] || !result.ContentLength || result.ContentLength>8*1024*1024) throw new Error("Fotografia inválida no armazenamento.");
    },
    async remove(path: string) { await client.send(new DeleteObjectCommand({ Bucket, Key:safeStoragePath(path) })); },
  };
}