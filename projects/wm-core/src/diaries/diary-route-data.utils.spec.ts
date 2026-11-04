import {PassportProgress, PassportStage} from '@wm-types/passport';
import {Diary} from './diary.model';
import {diaryKnownWalk, diaryRouteData, walksNear} from './diary-route-data.utils';

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

  it('date scritte nel diario prima di quelle note, anche a tappa non completata (ciclo 4)', () => {
    const p = progress([stage(70, {status: 'in_progress', percent: 40, walkedDates: []})]);
    const d = {...diary(70), walkDates: {start: '2026-05-09', end: '2026-05-11'}};

    expect(diaryRouteData(p, d)).toEqual({km: null, from: '2026-05-09', to: '2026-05-11', days: 3});
  });

  it('cammino non completato con date scritte: date senza km', () => {
    const p = progress([stage(70), stage(71, {status: 'not_started'})]);
    const d = {...diary(null), walkDates: {start: '2026-05-10', end: '2026-05-10'}};

    expect(diaryRouteData(p, d)).toEqual({km: null, from: '2026-05-10', to: '2026-05-10', days: 1});
  });

  it('ultima percorrenza nota: della tappa, o di tutte le tappe del cammino, gap di 30 giorni', () => {
    const p = progress([
      stage(70, {walkedDates: ['2024-05-01', '2026-05-10']}),
      stage(71, {walkedDates: ['2026-05-12']}),
      stage(72, {status: 'not_started', walkedDates: []}),
    ]);

    expect(diaryKnownWalk(p, 70)).toEqual({start: '2026-05-10', end: '2026-05-10'});
    expect(diaryKnownWalk(p, null)).toEqual({start: '2026-05-10', end: '2026-05-12'});
    expect(diaryKnownWalk(p, 72)).toBeNull();
    expect(diaryKnownWalk(null, 70)).toBeNull();
  });

  it('date vicine: si toccano entro un giorno', () => {
    const known = {start: '2026-05-10', end: '2026-05-12'};
    expect(walksNear({start: '2026-05-13', end: '2026-05-14'}, known)).toBeTrue();
    expect(walksNear({start: '2026-05-14', end: '2026-05-15'}, known)).toBeFalse();
    expect(walksNear({start: '2026-05-01', end: '2026-05-09'}, known)).toBeTrue();
  });

  it('diario del cammino senza date proprie: solo l\'ultima percorrenza delle tappe', () => {
    const p = progress([
      stage(70, {walkedDates: ['2024-05-01', '2024-05-02']}),
      stage(71, {walkedDates: ['2026-05-10']}),
      stage(72, {walkedDates: ['2026-05-11']}),
    ]);

    expect(diaryRouteData(p, diary(null))).toEqual(jasmine.objectContaining({from: '2026-05-10', to: '2026-05-11', days: 2}));
  });
});
