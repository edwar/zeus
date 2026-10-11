export type Detected = { mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" };

/** Tipo real por los primeros bytes (el `Content-Type` y la extensión los controla el cliente). */
export function detectType(b: Uint8Array): Detected["mediaType"] | null {
  const is = (...bytes: number[]) => bytes.every((v, i) => b[i] === v);
  if (is(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (is(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp"; // RIFF....WEBP
  return null;
}
