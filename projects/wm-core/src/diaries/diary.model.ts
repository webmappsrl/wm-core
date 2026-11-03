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
}
