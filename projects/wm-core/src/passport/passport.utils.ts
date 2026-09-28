/**
 * Gradi dell'arco verde di un anello di avanzamento del passaporto (oc:8166): unica regola per
 * anello del logo, dettaglio e icona della tappa in corso.
 *
 * @param percent Percentuale 0-100; valori fuori intervallo o assenti vengono limitati.
 * @returns Gradi 0-360.
 */
export function passportRingDegrees(percent: number | null | undefined): number {
  return Math.max(0, Math.min(100, percent ?? 0)) * 3.6;
}

/**
 * Converte l'id di un layer (stringa in `ILAYER`) nel numero usato dal passaporto.
 *
 * @param layerId Id del layer.
 * @returns L'id numerico, `null` se assente.
 */
export function toLayerId(layerId: string | number | null | undefined): number | null {
  return layerId != null && layerId !== '' ? Number(layerId) : null;
}
