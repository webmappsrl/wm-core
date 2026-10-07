import {Language} from '@wm-types/language';
import {
  PassportRoute,
  PassportStage,
  PassportStageChip,
  PassportStageIndex,
} from '@wm-types/passport';
import {ILAYER} from '@wm-core/types/config';

/** Stato di un timbro del passaporto (oc:8703). */
export type PassportStampStatus = 'in_progress' | 'completed' | 'not_started';

/**
 * Un timbro del passaporto: un cammino della config con l'avanzamento dell'utente (oc:8703).
 * `title` è il valore della config: un testo o, a runtime, un oggetto per lingua, da tradurre con
 * `wmTranslate`.
 */
export interface PassportStamp {
  layerId: number;
  title: string;
  logo: string | null;
  image: string | null;
  status: PassportStampStatus;
  validated: number;
  /** Tappe del cammino; per un cammino non iniziato da `attributes.stage_count`, `null` se manca. */
  total: number | null;
  percent: number;
}

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
 * Slug per un nome di file: minuscolo, senza accenti, ogni sequenza di caratteri non
 * alfanumerici diventa un solo «-», senza «-» in testa o in coda (oc:8702).
 *
 * @param text Testo da convertire.
 * @returns Lo slug, vuoto se il testo non contiene caratteri alfanumerici.
 */
export function slugify(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Nome del file dell'immagine di condivisione di una tappa: `<cammino>-<tappa>.png` (oc:8702).
 * La tappa è `tappa-<ref>` (senza un «Tappa» già presente nel `ref`) oppure, senza `ref`, il nome
 * nella lingua corrente. Se tutto è vuoto ripiega su `tappa-<trackId>.png`.
 *
 * @param layerTitle Titolo del cammino.
 * @param stage Tappa condivisa.
 * @param lang Lingua corrente dell'app.
 * @returns Il nome del file.
 */
export function stageShareFileName(
  layerTitle: string | null | undefined,
  stage: PassportStage,
  lang: string,
): string {
  const ref = slugify((stage?.ref ?? '').replace(/^\s*tappa\b\s*/i, ''));
  const stageSlug = ref ? `tappa-${ref}` : slugify(stageName(stage, lang));
  const slug = [slugify(layerTitle), stageSlug].filter(part => !!part).join('-');
  return `${slug || `tappa-${stage?.trackId}`}.png`;
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

/**
 * Timbri del passaporto (oc:8703): tutti i cammini della config, uniti all'avanzamento di
 * `/api/passport`. Prima gli in corso dal più avanzato, poi i completati, poi i non iniziati;
 * a parità, l'ordine della config. Un cammino di `/api/passport` assente dalla config non compare.
 *
 * @param layers Layer della config (`confMAPLAYERS`).
 * @param routes Cammini con almeno una tappa validata, per `layerId`.
 * @returns I timbri ordinati.
 */
export function passportStamps(
  layers: ILAYER[] | null | undefined,
  routes: Map<number, PassportRoute>,
): PassportStamp[] {
  const rank: Record<PassportStampStatus, number> = {in_progress: 0, completed: 1, not_started: 2};
  return (layers ?? [])
    .map((layer, index) => ({stamp: toStamp(layer, routes), index}))
    .sort(
      (a, b) =>
        rank[a.stamp.status] - rank[b.stamp.status] ||
        (a.stamp.status === 'in_progress' ? b.stamp.percent - a.stamp.percent : 0) ||
        a.index - b.index,
    )
    .map(({stamp}) => stamp);
}

/**
 * Timbro di un layer della config.
 *
 * @param layer Layer della config.
 * @param routes Cammini con almeno una tappa validata, per `layerId`.
 * @returns Il timbro.
 */
function toStamp(layer: ILAYER, routes: Map<number, PassportRoute>): PassportStamp {
  const layerId = Number(layer.id);
  const route = routes.get(layerId);
  const base = {
    layerId,
    title: layer.title,
    logo: layer.logo_image ?? null,
    image: layer.feature_image ?? null,
  };
  if (!route) {
    return {
      ...base,
      status: 'not_started',
      validated: 0,
      total: layer.attributes?.stage_count ?? null,
      percent: 0,
    };
  }
  return {
    ...base,
    status: route.completed ? 'completed' : 'in_progress',
    validated: route.validated,
    total: route.total,
    percent: route.percent,
  };
}

/**
 * Nome del file dell'immagine di condivisione di un cammino completato (oc:8703).
 *
 * @param layerTitle Titolo del cammino.
 * @param layerId Id del cammino, per il ripiego.
 * @returns `<cammino>.png`, oppure `cammino-<layerId>.png` se il titolo è vuoto.
 */
export function routeShareFileName(layerTitle: string | null | undefined, layerId: number): string {
  return `${slugify(layerTitle) || `cammino-${layerId}`}.png`;
}

/**
 * Data di completamento più recente fra le tappe (oc:8703).
 *
 * @param stages Tappe del cammino.
 * @returns La data ISO più recente, `null` se nessuna tappa ha una data.
 */
export function latestCompletedAt(stages: PassportStage[]): string | null {
  return (stages ?? [])
    .map(stage => stage.completedAt)
    .filter((iso): iso is string => !!iso)
    .reduce<string | null>(
      (latest, iso) => (latest == null || new Date(iso) > new Date(latest) ? iso : latest),
      null,
    );
}

/**
 * Lunghezza del cammino come somma delle tappe (oc:8703). Il backend manda 0 quando la distanza
 * manca: in quel caso il totale non è affidabile e non si mostra.
 *
 * @param stages Tappe del cammino.
 * @returns I km arrotondati a 0,1, `null` senza tappe o con una tappa a 0.
 */
export function totalDistanceKm(stages: PassportStage[]): number | null {
  if (!stages?.length || stages.some(stage => !(stage.distance > 0))) return null;
  return Math.round(stages.reduce((sum, stage) => sum + stage.distance, 0) * 10) / 10;
}

/**
 * Uscite del cammino: giorni distinti (nel fuso del dispositivo) delle validazioni, solo se tutte
 * le tappe sono validate col GPS (oc:8703). Con una validazione manuale la data è quella
 * dell'approvazione del gestore, e il numero di uscite non si sa.
 *
 * @param stages Tappe del cammino.
 * @returns Il numero di giorni, `null` se non si può sapere.
 */
export function gpsOutings(stages: PassportStage[]): number | null {
  if (!stages?.length) return null;
  if (
    stages.some(
      stage => stage.status !== 'completed' || stage.source !== 'gps' || !stage.completedAt,
    )
  ) {
    return null;
  }
  return new Set(stages.map(stage => new Date(stage.completedAt).toDateString())).size;
}

/**
 * Data lunga nella lingua dell'app («12 aprile 2026»), nel fuso del dispositivo (oc:8703).
 *
 * @param iso Data ISO 8601.
 * @param lang Lingua corrente dell'app.
 * @returns La data formattata, vuota se assente.
 */
export function passportLongDate(iso: string | undefined, lang: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * Km nella lingua dell'app, con al più una cifra decimale («35,5»), come nell'immagine di
 * condivisione (oc:8703).
 *
 * @param km Chilometri.
 * @param lang Lingua corrente dell'app.
 * @returns I km formattati, senza unità.
 */
export function passportKm(km: number, lang: string): string {
  return new Intl.NumberFormat(intlLocale(lang), {maximumFractionDigits: 1}).format(km);
}
