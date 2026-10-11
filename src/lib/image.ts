/**
 * Las fotos de celular pesan 3-10 MB y Vercel rechaza cuerpos > 4,5 MB: se reducen en el navegador
 * (máx. 2000 px, JPEG) antes de enviarlas. Los PDF se envían tal cual.
 */
export async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 1_000_000) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file; // formato que el navegador no decodifica (p. ej. HEIC): el servidor lo rechazará con un mensaje claro
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

export const MAX_TOTAL_BYTES = 4_200_000;
export const MAX_FILES = 3;
