/** Lato lungo massimo delle foto di un'esperienza inviate dal browser (oc:8169). */
export const EXPERIENCE_WEB_PHOTO_MAX_SIDE = 1600;
/** Qualità JPEG delle foto di un'esperienza inviate dal browser. */
export const EXPERIENCE_WEB_PHOTO_QUALITY = 0.8;

/**
 * Ridimensiona un'immagine su canvas, lato lungo al massimo `maxSide`, e la ricodifica in JPEG.
 * Serve sul web, dove il picker restituisce il file originale: su nativo la camera la riduce già.
 * Se il blob non si decodifica come immagine lo restituisce invariato (lo rifiuterà il backend).
 *
 * @param blob Immagine originale.
 * @param maxSide Lato lungo massimo, in pixel.
 * @param quality Qualità JPEG fra 0 e 1.
 * @returns L'immagine ridotta in JPEG, o l'originale se non decodificabile.
 */
export async function resizeImageBlob(
  blob: Blob,
  maxSide = EXPERIENCE_WEB_PHOTO_MAX_SIDE,
  quality = EXPERIENCE_WEB_PHOTO_QUALITY,
): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return blob;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const out = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  return out ?? blob;
}
