import {HomeResultTab} from '@wm-types/user-activity';

/** Conteggi e stato di `wm-home-result` da cui dipende il tab dei risultati. */
export interface HomeResultTabInput {
  countTracks: number;
  countPois: number;
  /** Cammini della Home che corrispondono a testo e filtri. */
  countLayers: number;
  /** Tab cliccato dall'utente (`homeResultTabSelected`), o null. */
  userSelectedTab: HomeResultTab;
  /** Selettore `showTracks`: false con soli filtri POI, senza layer né UGC aperti. */
  showTracks: boolean;
  hasCurrentLayer: boolean;
  /** Almeno un filtro Home (oc:8414) selezionato. */
  hasActiveRouteFilters: boolean;
}

export interface HomeResultTabResult {
  tab: HomeResultTab;
  /** Il pulsante Tracks è visibile: il template lo legge invece di ricalcolarlo. */
  tracksTabVisible: boolean;
  /** Il pulsante POI è visibile: il template lo legge invece di ricalcolarlo. */
  poisTabVisible: boolean;
}

/**
 * Sceglie il tab dei risultati di `wm-home-result` e dice se i pulsanti Tracks e POI sono visibili.
 *
 * Il tab Tracks vale solo quando il suo pulsante è visibile: con soli filtri POI `showTracks` è
 * false, il pulsante è nascosto e restituire `'tracks'` lasciava selezionato un tab invisibile,
 * con la lista dei sentieri sotto il solo pulsante POI (oc:8933). Le regole di visibilità della
 * barra e dello stato vuoto stanno qui e in `homeResultEmptyState` (oc:8765).
 *
 * Ordine: filtri Home attivi senza layer aperto → layers o nessun tab; poi il tab cliccato
 * dall'utente, se il suo pulsante c'è; poi layers → tracks → pois → null.
 * @param input conteggi e stato correnti di `wm-home-result`
 * @returns il tab da mostrare e la visibilità dei pulsanti Tracks e POI
 */
export function homeResultTab(input: HomeResultTabInput): HomeResultTabResult {
  const {
    countTracks,
    countPois,
    countLayers,
    userSelectedTab,
    showTracks,
    hasCurrentLayer,
    hasActiveRouteFilters,
  } = input;
  // Se un layer è già aperto, il tab layers non esiste nell'UI — mai restituirlo
  const layersAvailable = countLayers > 0 && !hasCurrentLayer;
  const tracksAvailable = countTracks > 0 && showTracks;
  // Filtri Home (oc:8414) attivi: solo i cammini sono pertinenti, tracce e POI no. Non vale con
  // un layer aperto, dove le tappe/tracce del layer restano visibili come di consueto.
  const routeFiltersPrevail = hasActiveRouteFilters && !hasCurrentLayer;
  const tracksTabVisible = tracksAvailable && !routeFiltersPrevail;
  const poisTabVisible = countPois > 0 && !routeFiltersPrevail;
  const result = (tab: HomeResultTab): HomeResultTabResult => ({tab, tracksTabVisible, poisTabVisible});

  if (routeFiltersPrevail) return result(layersAvailable ? 'layers' : null);

  // Rispetta la scelta esplicita dell'utente, se il suo pulsante è visibile
  if (userSelectedTab === 'tracks' && tracksAvailable) return result('tracks');
  if (userSelectedTab === 'pois' && countPois > 0) return result('pois');
  if (userSelectedTab === 'layers' && layersAvailable) return result('layers');

  // Default automatico: layers prima, poi tracks, poi pois
  if (layersAvailable) return result('layers');
  if (tracksAvailable) return result('tracks');
  if (countPois > 0) return result('pois');
  return result(null);
}
