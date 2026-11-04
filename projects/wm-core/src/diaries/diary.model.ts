import {DateRange} from '../shared/date-range-picker/date-range.utils';

/** Esperienza dell'utente su un cammino o una tappa (oc:8169). */
export interface Diary {
  id: number;
  uuid: string;
  layer: {id: number; name: string};
  ecTrack: {id: number; name: string} | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  photos: {id: number; url: string; thumbnail: string}[];
  ugcTrackIds: number[];
  /** Consenso alla ripubblicazione sui canali di Cammini d'Italia (oc:8169, ciclo 2). */
  publicationConsent: boolean;
  /** Valutazioni facoltative da 1 a 5 (oc:8169, ciclo 2). */
  ratings?: DiaryRatings;
  /** Date di percorrenza scritte dall'utente (oc:8169, ciclo 4), `null` se non ci sono. */
  walkDates?: DateRange | null;
}

/** Chiave di una valutazione: cammino (o tappa), ospitalità, difficoltà percepita. */
export type DiaryRatingKey = 'route' | 'hospitality' | 'difficulty';

/** Valutazioni da 1 a 5, `null` (o assente) se non date. */
export type DiaryRatings = Partial<Record<DiaryRatingKey, number | null>>;

/** Valutazioni tutte vuote. */
export const EMPTY_DIARY_RATINGS: Required<DiaryRatings> = {route: null, hospitality: null, difficulty: null};

/**
 * Valutazioni complete, con `null` dove mancano.
 *
 * @param ratings Valutazioni, anche parziali o assenti.
 * @returns Le tre valutazioni.
 */
export function normalizeDiaryRatings(ratings?: DiaryRatings | null): Required<DiaryRatings> {
  return {
    route: ratings?.route ?? null,
    hospitality: ratings?.hospitality ?? null,
    difficulty: ratings?.difficulty ?? null,
  };
}

/**
 * Stato della funzione: `off` solo se disattivata dal backend (404, l'interruttore); `offline`
 * senza rete (segnale di rete dell'app); `error` con la rete presente ma la lettura fallita
 * (5xx, status 0, timeout). In `offline` ed `error` la lista è l'ultima copia salvata sul
 * telefono, se c'è.
 */
export type DiariesStatus =
  | 'loading'
  | 'active'
  | 'login-required'
  | 'off'
  | 'offline'
  | 'error';

/** Filtro delle esperienze: per cammino, tappa o registrazione. */
export interface DiaryFilter {
  layerId?: number;
  ecTrackId?: number;
  ugcTrackId?: number;
  /** Solo `mine` è supportato per ora. */
  scope?: 'mine' | 'all';
}

/** Dati di creazione o modifica di un'esperienza. */
export interface DiaryDraft {
  uuid: string;
  layerId?: number;
  ecTrackId?: number;
  description: string;
  newPhotos: Blob[];
  keepMediaIds?: number[];
  /** Spunta del consenso alla ripubblicazione; assente vale `false`. */
  publicationConsent?: boolean;
  /** Valutazioni; assenti valgono «non date». */
  ratings?: DiaryRatings;
  /**
   * Date di percorrenza (oc:8169, ciclo 4): `undefined` = campo non toccato, non si inviano;
   * `null` = svuotato, si inviano vuote.
   */
  walkDates?: DateRange | null;
}

/**
 * Confronta due insiemi di valutazioni.
 *
 * @param a Prime valutazioni.
 * @param b Seconde valutazioni.
 * @returns `true` se le tre valutazioni coincidono.
 */
export function sameDiaryRatings(a?: DiaryRatings | null, b?: DiaryRatings | null): boolean {
  const x = normalizeDiaryRatings(a);
  const y = normalizeDiaryRatings(b);
  return x.route === y.route && x.hospitality === y.hospitality && x.difficulty === y.difficulty;
}
