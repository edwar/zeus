import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

/** Borra un archivo del almacenamiento a partir de su URL pública (solo si es de este bucket). */
export async function deletePublic(url: string): Promise<boolean> {
  const base = `${publicBaseUrl()}/`;
  if (!url.startsWith(base)) return false;
  await s3().send(new DeleteObjectCommand({ Bucket: env().bucket, Key: url.slice(base.length) }));
  return true;
}

/**
 * Archivos privados (fotos de obra de los clientes). Se guardan con una clave aleatoria bajo `private/` y NUNCA se entrega su URL:
 * se leen solo desde el servidor, después de comprobar el permiso. Conviene que el bucket no sea de lectura pública para `private/`.
 */
export async function putPrivate(key: string, data: Buffer | Uint8Array, contentType: string): Promise<void> {
  await s3().send(new PutObjectCommand({ Bucket: env().bucket, Key: key, Body: data, ContentType: contentType, CacheControl: "private, max-age=3600" }));
}

export async function getPrivate(key: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  try {
    const r = await s3().send(new GetObjectCommand({ Bucket: env().bucket, Key: key }));
    return r.Body ? { bytes: await r.Body.transformToByteArray(), type: r.ContentType ?? "application/octet-stream" } : null;
  } catch {
    return null;
  }
}

export async function deletePrivate(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: env().bucket, Key: key }));
}
