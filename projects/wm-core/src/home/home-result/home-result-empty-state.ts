/** Quale messaggio di stato vuoto mostra `wm-home-result`, o nessuno (oc:8765). */
export type HomeResultEmptyState = 'filters' | 'generic' | null;

/** Testo i18n (chiave = testo italiano) di ciascuno stato vuoto. */
export const HOME_RESULT_EMPTY_MESSAGES: Record<Exclude<HomeResultEmptyState, null>, string> = {
  filters: 'Spiacenti, non ci sono cammini inerenti alla ricerca',
  generic: 'Spiacenti non ci sono risultati con questi criteri di ricerca.',
};

/** Conteggi e stato di `wm-home-result` da cui dipende lo stato vuoto. */
export interface HomeResultEmptyStateInput {
  /** Tracce + POI (+ UGC se aperte), dal selettore `countAll`. */
  countAll: number;
  /** Cammini della Home che corrispondono a testo e filtri. */
  countLayers: number;
  /** Almeno un filtro Home (oc:8414) selezionato. */
  hasActiveRouteFilters: boolean;
  /** Un layer è aperto: i filtri Home non valgono più. */
  hasCurrentLayer: boolean;
  /** Le tracce sono in caricamento da Elastic. */
  tracksLoading: boolean;
  /** Vista delle UGC aperta: i filtri Home restano nello store ma non riguardano le UGC. */
  ugcOpened: boolean;
}

/**
 * Sceglie lo stato vuoto di `wm-home-result`.
 *
 * Con filtri Home attivi tracce e POI sono nascosti (solo i cammini sono pertinenti), quindi
 * zero cammini vuol dire pannello vuoto anche se `countAll > 0`: vale il messaggio sui filtri,
 * che dipende solo dalla configurazione e non aspetta il caricamento delle tracce. Altrimenti
 * il messaggio generico compare solo a caricamento finito e con tutto a zero.
 * @param input conteggi e stato correnti di `wm-home-result`
 * @returns `'filters'`, `'generic'` o `null` se c'è qualcosa da mostrare
 */
export function homeResultEmptyState(input: HomeResultEmptyStateInput): HomeResultEmptyState {
  const {countAll, countLayers, hasActiveRouteFilters, hasCurrentLayer, tracksLoading, ugcOpened} =
    input;
  if (hasActiveRouteFilters && !hasCurrentLayer && !ugcOpened && countLayers === 0)
    return 'filters';
  if (!tracksLoading && countAll === 0 && countLayers === 0) return 'generic';
  return null;
}
