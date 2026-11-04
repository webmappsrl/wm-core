import '../passport/passport-walked';
import {PassportProgress, PassportStage} from '@wm-types/passport';
import {totalDistanceKm} from '../passport/passport.utils';
import {Diary} from './diary.model';

/** Dati della scheda «Il tuo percorso» nel dettaglio del diario. */
export interface DiaryRouteData {
  /** Km, `null` se non si sanno. */
  km: number | null;
  /** Primo giorno (`Y-m-d`), `null` se non si sa. */
  from: string | null;
  /** Ultimo giorno (`Y-m-d`), `null` se non si sa. */
  to: string | null;
  /** Giorni distinti, `null` se non si sanno. */
  days: number | null;
}

/**
 * Dati del percorso per la scheda del diario (oc:8169, ciclo 2): prima i dati dell'utente, dove
 * mancano quelli del cammino. Solo se quello che il diario racconta è stato percorso: la tappa
 * completata, o il cammino completato.
 *
 * - km della tappa: `userDistance` (registrazioni dell'utente), altrimenti la lunghezza della tappa.
 * - km del cammino: `userDistanceTotal`, altrimenti la somma delle tappe completate.
 * - giorni: da `walkedDates` (registrazioni o richiesta cartacea); per il cammino servono quelli di
 *   ogni tappa completata, altrimenti date e giorni non si mostrano. Le varianti non percorse di
 *   un cammino completato per gruppi non contano.
 *
 * @param progress Progresso del cammino, `null` se non letto.
 * @param diary Diario.
 * @returns I dati della scheda, `null` se la scheda non va mostrata.
 */
export function diaryRouteData(progress: PassportProgress | null | undefined, diary: Diary): DiaryRouteData | null {
  if (!progress) return null;
  if (diary.ecTrack) {
    const stage = progress.stages.find(s => s.trackId === diary.ecTrack!.id);
    if (!stage || stage.status !== 'completed') return null;
    const km = stage.userDistance ?? (stage.distance > 0 ? stage.distance : null);
    return {km, ...datesOf([stage])};
  }
  if (!progress.completed) return null;
  // solo le tappe percorse: in un cammino con varianti quelle saltate restano «not_started»
  const walked = progress.stages.filter(s => s.status === 'completed');
  const km = progress.userDistanceTotal ?? totalDistanceKm(walked);
  return {km, ...datesOf(walked)};
}

/**
 * Primo e ultimo giorno e numero di giorni distinti delle tappe.
 *
 * @param stages Tappe.
 * @returns Le date, tutte `null` se una tappa non ha giorni.
 */
function datesOf(stages: PassportStage[]): Pick<DiaryRouteData, 'from' | 'to' | 'days'> {
  const none = {from: null, to: null, days: null};
  if (stages.length === 0 || stages.some(s => !s.walkedDates?.length)) return none;
  const dates = Array.from(new Set(stages.reduce<string[]>((all, s) => all.concat(s.walkedDates ?? []), []))).sort();
  return {from: dates[0], to: dates[dates.length - 1], days: dates.length};
}
