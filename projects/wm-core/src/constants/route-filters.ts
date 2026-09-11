// Costanti per la feature filtri Home "Cerca il tuo cammino" (oc:8414).
// Usate da home-route-filters.utils.ts e search-bar.component.camminiditalia.ts.
//
// Soglie SOLO frontend (non un vocabolario condiviso col backend, a differenza di
// RouteShape/WalkingNetwork/Season — quelli vivono in @wm-types/config): definiscono i bucket a
// soglia fissa per i due filtri numerici, fedeli a camminiditalia.org.

import {NumericBucket} from '@wm-types/config';

/** Soglie fisse per il filtro Tappe, fedeli a camminiditalia.org — verificate contro la distribuzione reale (min 2, max 99, quartili ~5/7/11 sui 117 layer con dati al momento della pianificazione). */
export const STAGE_COUNT_BUCKETS: NumericBucket[] = [
  {id: '0-5', min: 0, max: 5, unitKey: 'tappe'},
  {id: '5-10', min: 5, max: 10, unitKey: 'tappe'},
  {id: '10-20', min: 10, max: 20, unitKey: 'tappe'},
  {id: '20+', min: 20, max: null, unitKey: 'tappe'},
];

/** Soglie fisse per il filtro Lunghezza, derivate dalla distribuzione reale (min 13.5, max 1974.8, quartili ~83/114/184 km sui 109 layer con dati al momento della pianificazione). */
export const DISTANCE_BUCKETS: NumericBucket[] = [
  {id: '0-50', min: 0, max: 50, unitKey: 'km'},
  {id: '50-100', min: 50, max: 100, unitKey: 'km'},
  {id: '100-200', min: 100, max: 200, unitKey: 'km'},
  {id: '200+', min: 200, max: null, unitKey: 'km'},
];
