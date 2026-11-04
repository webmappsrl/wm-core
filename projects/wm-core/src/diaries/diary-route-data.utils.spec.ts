import {PassportProgress, PassportStage} from '@wm-types/passport';
import {Diary} from './diary.model';
import {diaryRouteData} from './diary-route-data.utils';

/**
 * Tappa di prova.
 * @param trackId id della tappa
 * @param extra campi da sovrascrivere
 * @returns la tappa
 */
function stage(trackId: number, extra: Partial<PassportStage> = {}): PassportStage {
  return {trackId, name: {}, status: 'completed', distance: 10, ...extra};
}

/**
 * Progresso di prova.
 * @param stages tappe
 * @param extra campi da sovrascrivere
 * @returns il progresso
 */
function progress(stages: PassportStage[], extra: Partial<PassportProgress> = {}): PassportProgress {
  const done = stages.filter(s => s.status === 'completed').length;
  return {
    layerId: 7,
    totalStages: stages.length,
    completedStages: done,
    percent: Math.round((done / stages.length) * 100),
    completed: done === stages.length,
    stages,
    ...extra,
  };
}

/**
 * Diario di prova.
 * @param ecTrackId tappa, `null` per il diario del cammino
 * @returns il diario
 */
function diary(ecTrackId: number | null): Diary {
  return {
    id: 1,
    uuid: 'u1',
    layer: {id: 7, name: 'Cammino Minerario'},
    ecTrack: ecTrackId != null ? {id: ecTrackId, name: 'Tappa'} : null,
    description: 'x',
    createdAt: '2026-06-12T10:00:00Z',
    updatedAt: '2026-06-12T10:00:00Z',
    photos: [],
    ugcTrackIds: [],
    publicationConsent: false,
  };
}

describe('diaryRouteData (oc:8169, ciclo 2)', () => {
  it('tappa GPS: km e giorno dell\'utente', () => {
    const p = progress([stage(70, {distance: 14, userDistance: 12.3, walkedDates: ['2026-05-02']})]);

    expect(diaryRouteData(p, diary(70))).toEqual({km: 12.3, from: '2026-05-02', to: '2026-05-02', days: 1});
  });

  it('tappa cartacea: lunghezza della tappa e giorni della richiesta', () => {
    const p = progress([
      stage(70, {distance: 14, userDistance: null, walkedDates: ['2026-05-01', '2026-05-02', '2026-05-03']}),
    ]);

    expect(diaryRouteData(p, diary(70))).toEqual({km: 14, from: '2026-05-01', to: '2026-05-03', days: 3});
  });

  it('tappa non completata: nessuna scheda', () => {
    const p = progress([stage(70, {status: 'in_progress', percent: 40})]);

    expect(diaryRouteData(p, diary(70))).toBeNull();
  });

  it('cammino completato: km totali dell\'utente e giorni distinti di tutte le tappe', () => {
    const p = progress(
      [
        stage(70, {walkedDates: ['2026-05-01']}),
        stage(71, {walkedDates: ['2026-05-01', '2026-05-02']}),
        stage(72, {walkedDates: ['2026-05-04']}),
      ],
      {userDistanceTotal: 31.7},
    );

    expect(diaryRouteData(p, diary(null))).toEqual({km: 31.7, from: '2026-05-01', to: '2026-05-04', days: 3});
  });

  it('una tappa senza giorni: km sì, date e giorni no', () => {
    const p = progress([stage(70, {walkedDates: ['2026-05-01']}), stage(71, {walkedDates: []})], {
      userDistanceTotal: 20,
    });

    expect(diaryRouteData(p, diary(null))).toEqual({km: 20, from: null, to: null, days: null});
  });

  it('cammino non completato: nessuna scheda', () => {
    const p = progress([stage(70), stage(71, {status: 'not_started'})]);

    expect(diaryRouteData(p, diary(null))).toBeNull();
  });

  it('backend senza i campi nuovi: lunghezza del cammino, nessuna data', () => {
    const p = progress([stage(70, {distance: 12}), stage(71, {distance: 8.5})]);

    expect(diaryRouteData(p, diary(null))).toEqual({km: 20.5, from: null, to: null, days: null});
  });

  it('cammino con varianti: date e km solo delle tappe percorse, non delle varianti saltate', () => {
    const p = progress(
      [
        stage(70, {distance: 12, walkedDates: ['2026-05-01']}),
        stage(71, {distance: 9, walkedDates: ['2026-05-02']}),
        stage(72, {distance: 30, status: 'not_started', walkedDates: []}),
      ],
      {completed: true},
    );

    expect(diaryRouteData(p, diary(null))).toEqual({km: 21, from: '2026-05-01', to: '2026-05-02', days: 2});
  });

  it('senza progresso: nessuna scheda', () => {
    expect(diaryRouteData(null, diary(null))).toBeNull();
  });
});
