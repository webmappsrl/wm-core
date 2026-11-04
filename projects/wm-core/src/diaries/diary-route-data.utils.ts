import '../passport/passport-walked';
import {PassportProgress, PassportStage} from '@wm-types/passport';
import {totalDistanceKm} from '../passport/passport.utils';
import {Diary} from './diary.model';
import {DateRange} from '../shared/date-range-picker/date-range.utils';

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
  // date scritte nel diario (ciclo 4): valgono prima di quelle note, anche a percorso non completato;
  // i km solo a percorso completato
  if (diary.walkDates) {
    const known = progress ? diaryRouteData(progress, {...diary, walkDates: null}) : null;
    const {start, end} = diary.walkDates;
    return {km: known?.km ?? null, from: start, to: end, days: daysInclusive(start, end)};
  }
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
  // ciclo 4: le date del cammino sono quelle dell'ultima percorrenza delle tappe, come nel collegamento
  const latest = walked.some(s => !s.walkedDates?.length) ? null : diaryKnownWalk({...progress, stages: walked}, null);
  if (!latest) return {km, ...datesOf(walked)};
  const days = new Set(
    walked.reduce<string[]>((all, s) => all.concat(s.walkedDates ?? []), []).filter(d => d >= latest.start && d <= latest.end),
  );
  return {km, from: latest.start, to: latest.end, days: days.size};
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

/** Giorni oltre i quali due date appartengono a percorrenze diverse, come nel backend (ciclo 4). */
export const WALK_GAP_DAYS = 30;

/**
 * Ultima percorrenza nota dal Passaporto (oc:8169, ciclo 4): i giorni della tappa, o di tutte le tappe
 * del cammino, divisi in percorrenze (oltre 30 giorni di distanza) e tenuta la più recente.
 *
 * @param progress Progresso del cammino.
 * @param ecTrackId Tappa del diario, `null` per il diario del cammino.
 * @returns Primo e ultimo giorno, `null` senza date.
 */
export function diaryKnownWalk(progress: PassportProgress | null | undefined, ecTrackId: number | null): DateRange | null {
  if (!progress) return null;
  const stages = ecTrackId != null ? progress.stages.filter(s => s.trackId === ecTrackId) : progress.stages;
  const days = Array.from(new Set(stages.reduce<string[]>((all, s) => all.concat(s.walkedDates ?? []), []))).sort();
  if (days.length === 0) return null;
  let first = days.length - 1;
  while (first > 0 && dayDiff(days[first - 1], days[first]) <= WALK_GAP_DAYS) first--;
  return {start: days[first], end: days[days.length - 1]};
}

/**
 * Due periodi si toccano entro un giorno (per l'avviso «date lontane»).
 *
 * @param a Periodo scritto.
 * @param b Periodo noto.
 * @returns `true` se si sovrappongono o distano al massimo un giorno.
 */
export function walksNear(a: DateRange, b: DateRange): boolean {
  return dayDiff(a.end, b.start) <= 1 && dayDiff(b.end, a.start) <= 1;
}

/**
 * @param from Giorno `AAAA-MM-GG`.
 * @param to Giorno `AAAA-MM-GG`.
 * @returns I giorni da `from` a `to` (negativo se `to` viene prima).
 */
function dayDiff(from: string, to: string): number {
  const ms = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86400000);
}

/**
 * @param from Primo giorno.
 * @param to Ultimo giorno.
 * @returns I giorni del periodo, estremi compresi.
 */
function daysInclusive(from: string, to: string): number {
  return dayDiff(from, to) + 1;
}
