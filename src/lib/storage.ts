import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Almacenamiento público de imágenes sobre cualquier servicio compatible con S3
 * (hoy Neon Object Storage; sirve igual Cloudflare R2, AWS S3, etc.). El bucket debe ser de lectura pública.
 */
const env = () => ({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION || "us-east-1",
  bucket: process.env.STORAGE_BUCKET,
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  // Opcional: dominio propio/CDN delante del bucket (p. ej. https://img.midominio.com)
  publicBase: process.env.STORAGE_PUBLIC_URL,
});

export const storageConfigured = () => {
  const e = env();
  return Boolean(e.endpoint && e.bucket && e.accessKeyId && e.secretAccessKey);
};

export const publicBaseUrl = () => {
  const e = env();
  return (e.publicBase ?? `${e.endpoint}/${e.bucket}`).replace(/\/$/, "");
};

let client: S3Client | null = null;
const s3 = () => {
  const e = env();
  return (client ??= new S3Client({
    region: e.region,
    endpoint: e.endpoint,
    forcePathStyle: true, // requerido por endpoints S3 propios
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: { accessKeyId: e.accessKeyId!, secretAccessKey: e.secretAccessKey! },
  }));
};

/** Sube un archivo y devuelve su URL pública. La clave es determinista, así que volver a subirla la sobrescribe. */
export async function putPublic(key: string, data: Buffer | Uint8Array, contentType: string): Promise<string> {
  await s3().send(
    new PutObjectCommand({ Bucket: env().bucket, Key: key, Body: data, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }),
  );
  return `${publicBaseUrl()}/${key}`;
}
