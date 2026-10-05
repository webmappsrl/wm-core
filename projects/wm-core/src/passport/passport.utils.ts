import {Language} from '@wm-types/language';
import {PassportStage, PassportStageChip, PassportStageIndex} from '@wm-types/passport';

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

/**
 * Nome di una tappa nella lingua corrente, poi in italiano, poi nella prima lingua disponibile
 * (oc:8676).
 *
 * @param stage Tappa del passaporto.
 * @param lang Lingua corrente dell'app.
 * @returns Il nome, vuoto se la tappa non ne ha.
 */
export function stageName(stage: PassportStage, lang: string): string {
  const name = stage?.name ?? {};
  return name[lang as Language] || name.it || Object.values(name).find(v => !!v) || '';
}

/**
 * Tappe ordinate per nome con confronto naturale («Tappa 02» prima di «Tappa 10»), quelle senza
 * nome in fondo (oc:8676): il backend non ha un ordine di percorrenza.
 *
 * @param stages Tappe del cammino, non modificate.
 * @param lang Lingua corrente dell'app, usata per il nome e per il confronto.
 * @returns Una copia ordinata.
 */
export function sortStages(stages: PassportStage[], lang: string): PassportStage[] {
  const locale = intlLocale(lang);
  return [...(stages ?? [])].sort((a, b) => {
    const nameA = sortKey(stageName(a, lang));
    const nameB = sortKey(stageName(b, lang));
    if (!nameA || !nameB) return nameA ? -1 : nameB ? 1 : 0;
    return nameA.localeCompare(nameB, locale, {numeric: true});
  });
}

/**
 * Chiave di ordinamento: i due punti diventano spazi, così «Tappa 09: …» precede sempre
 * «Tappa 09 Variante: …», qualunque sia la parola che segue (lo spazio viene prima delle lettere).
 *
 * @param name Nome della tappa.
 * @returns La chiave da confrontare.
 */
function sortKey(name: string): string {
  return name.replace(/:/g, ' ');
}

/**
 * Data breve nella lingua dell'app («12 mag»), come nel wireframe, nel fuso del dispositivo.
 *
 * @param iso Data ISO 8601.
 * @param lang Lingua corrente dell'app.
 * @returns La data formattata, vuota se assente.
 */
export function passportShortDate(iso: string | undefined, lang: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), {day: 'numeric', month: 'short'}).format(
    new Date(iso),
  );
}

/**
 * Codice di lingua per `Intl`: nel repo il portoghese ha codice «pr», che `Intl` non riconosce.
 *
 * @param lang Lingua corrente dell'app.
 * @returns Il codice per `Intl`, `it` se assente.
 */
function intlLocale(lang: string | undefined): string {
  return lang === 'pr' ? 'pt' : lang || 'it';
}

/**
 * Stato del chip di una card di tappa (oc:8701). Nessun chip se il dato non è noto: utente non
 * loggato, id non numerico, o tappa non validata in un cammino la cui lettura non ha mai risposto.
 *
 * @param index Tappe validate dell'utente, `null` se non disponibili.
 * @param trackId Id della tappa (nell'hit Elastic può essere una stringa).
 * @param layers Cammini che contengono la tappa.
 * @returns Lo stato del chip, `null` se il chip non va mostrato.
 */
export function passportStageChip(
  index: PassportStageIndex | null,
  trackId: number | string | null | undefined,
  layers: number[] | null | undefined,
): PassportStageChip | null {
  if (!index || trackId == null || trackId === '') return null;
  const id = Number(trackId);
  if (Number.isNaN(id)) return null;
  const completedAt = index.completedAt.get(id);
  if (completedAt) return {status: 'completed', completedAt};
  if ((layers ?? []).some(layerId => index.pendingLayers.has(Number(layerId)))) return null;
  return {status: 'not_started'};
}
