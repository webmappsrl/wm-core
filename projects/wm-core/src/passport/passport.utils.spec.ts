import {PassportRoute, PassportStage, PassportStageIndex} from '@wm-types/passport';
import {ILAYER} from '@wm-core/types/config';
import {
  gpsOutings,
  latestCompletedAt,
  passportKm,
  passportLongDate,
  passportStamps,
  routeShareFileName,
  totalDistanceKm,
  passportShortDate,
  passportStageChip,
  slugify,
  sortStages,
  stageName,
  stageShareFileName,
  stampInitials,
} from './passport.utils';

describe('passport.utils (oc:8676)', () => {
  const stage = (trackId: number, name: PassportStage['name']): PassportStage => ({
    trackId,
    name,
    status: 'not_started',
    distance: 0,
  });

  describe('sortStages', () => {
    it('ordina per nome con confronto naturale', () => {
      const stages = [
        stage(1, {it: 'Tappa 10: Iglesias'}),
        stage(2, {it: 'Tappa 02: Nebida'}),
        stage(3, {it: 'Tappa 09 Variante: Coco'}),
        stage(4, {it: 'Tappa 09: Coco'}),
      ];

      expect(sortStages(stages, 'it').map(s => s.trackId)).toEqual([2, 4, 3, 1]);
    });

    it('la tappa principale precede la variante qualunque sia la parola che segue', () => {
      const stages = [stage(1, {it: 'Tappa 09 Variante: Macchie'}), stage(2, {it: 'Tappa 09: Zappa'})];

      expect(sortStages(stages, 'it').map(s => s.trackId)).toEqual([2, 1]);
    });

    it('mette in fondo le tappe senza nome', () => {
      const stages = [stage(1, {}), stage(2, {it: 'Tappa 01'})];

      expect(sortStages(stages, 'it').map(s => s.trackId)).toEqual([2, 1]);
    });

    it("senza il nome nella lingua corrente usa l'italiano", () => {
      const stages = [stage(1, {it: 'Tappa 02'}), stage(2, {it: 'Tappa 01'})];

      expect(sortStages(stages, 'en').map(s => s.trackId)).toEqual([2, 1]);
    });

    it("non modifica l'array ricevuto", () => {
      const stages = [stage(1, {it: 'Tappa 02'}), stage(2, {it: 'Tappa 01'})];
      sortStages(stages, 'it');

      expect(stages.map(s => s.trackId)).toEqual([1, 2]);
    });
  });

  describe('stageName', () => {
    it('preferisce la lingua corrente, poi l\'italiano, poi la prima disponibile', () => {
      expect(stageName(stage(1, {it: 'Uno', en: 'One'}), 'en')).toBe('One');
      expect(stageName(stage(1, {it: 'Uno'}), 'en')).toBe('Uno');
      expect(stageName(stage(1, {de: 'Eins'}), 'en')).toBe('Eins');
      expect(stageName(stage(1, {}), 'en')).toBe('');
    });
  });

  describe('passportShortDate', () => {
    it('formatta giorno e mese breve', () => {
      const date = passportShortDate('2026-09-30T14:45:55+00:00', 'it');

      expect(date).toContain('30');
      expect(date).toContain('set');
    });

    it('restituisce una stringa vuota senza data', () => {
      expect(passportShortDate(undefined, 'it')).toBe('');
    });

    it('accetta il codice «pr» del portoghese', () => {
      expect(() => passportShortDate('2026-09-30T14:45:55+00:00', 'pr')).not.toThrow();
    });
  });

  describe('passportStageChip (oc:8701)', () => {
    const index = (pending: number[] = []): PassportStageIndex => ({
      completedAt: new Map([[203, '2026-05-12T10:00:00+00:00']]),
      pendingLayers: new Set(pending),
    });

    it('index null → null', () => {
      expect(passportStageChip(null, 203, [40])).toBeNull();
    });

    it('trackId NaN o assente → null', () => {
      expect(passportStageChip(index(), 'abc', [40])).toBeNull();
      expect(passportStageChip(index(), undefined, [40])).toBeNull();
      expect(passportStageChip(index(), null, [40])).toBeNull();
    });

    it('tappa validata → completed con la data, anche con id stringa', () => {
      const done = {status: 'completed', completedAt: '2026-05-12T10:00:00+00:00'};
      expect(passportStageChip(index(), 203, [40])).toEqual(done as any);
      expect(passportStageChip(index(), '203', [40])).toEqual(done as any);
    });

    it('tappa non validata, cammini noti → not_started', () => {
      expect(passportStageChip(index(), 215, [40])).toEqual({status: 'not_started'});
    });

    it('tappa non validata, uno dei suoi layer è pendente → null', () => {
      expect(passportStageChip(index([63]), 611, [40, 63])).toBeNull();
    });

    it('tappa validata, anche se un altro suo layer è pendente → completed', () => {
      expect(passportStageChip(index([63]), 203, [40, 63])?.status).toBe('completed');
    });

    it('layers assente → trattato come []', () => {
      expect(passportStageChip(index([63]), 215, undefined)).toEqual({status: 'not_started'});
    });
  });

  describe('slugify (oc:8702)', () => {
    it('minuscolo, senza accenti, separatori compressi', () => {
      expect(slugify('  Cammino d\'Italia: Perù, è così! ')).toBe('cammino-d-italia-peru-e-cosi');
    });

    it('vuoto o senza alfanumerici → stringa vuota', () => {
      expect(slugify(undefined)).toBe('');
      expect(slugify('—/ ')).toBe('');
    });
  });

  describe('stageShareFileName (oc:8702)', () => {
    const withRef = (ref: string | undefined, name: PassportStage['name'] = {it: 'Da A a B'}) =>
      ({...stage(704, name), ref}) as PassportStage;

    it('ref numerico → cammino-tappa-ref', () => {
      expect(stageShareFileName('Cammino Grande di Celestino', withRef('04'), 'it')).toBe(
        'cammino-grande-di-celestino-tappa-04.png',
      );
    });

    it('ref con «Tappa» già dentro → non lo ripete', () => {
      expect(stageShareFileName('Cammino di Dante', withRef('Tappa 7b'), 'it')).toBe(
        'cammino-di-dante-tappa-7b.png',
      );
      expect(stageShareFileName('Dante', withRef('tappa 9'), 'it')).toBe('dante-tappa-9.png');
    });

    it('senza ref → nome della tappa nella lingua corrente', () => {
      const s = withRef('', {it: 'Tappa 06: Città', en: 'Stage 06: Town'});
      expect(stageShareFileName('Dante', s, 'en')).toBe('dante-stage-06-town.png');
      expect(stageShareFileName('Dante', s, 'it')).toBe('dante-tappa-06-citta.png');
    });

    it('senza titolo del cammino → solo la tappa', () => {
      expect(stageShareFileName(undefined, withRef('04'), 'it')).toBe('tappa-04.png');
    });

    it('tutto vuoto → tappa-<trackId>', () => {
      expect(stageShareFileName('', withRef(undefined, {}), 'it')).toBe('tappa-704.png');
    });
  });
});

describe('passport.utils, passaporto a timbri (oc:8703)', () => {
  const layer = (id: number, stageCount?: number): ILAYER =>
    ({
      id: String(id),
      title: `Cammino ${id}`,
      logo_image: `logo-${id}.png`,
      feature_image: `img-${id}.jpg`,
      ...(stageCount != null ? {attributes: {stage_count: stageCount}} : {}),
    }) as unknown as ILAYER;
  const route = (layerId: number, percent: number, completed = false): PassportRoute => ({
    layerId,
    validated: completed ? 10 : Math.round(percent / 10),
    total: 10,
    percent,
    completed,
  });

  describe('stampInitials', () => {
    it('salta «Cammino», articoli e preposizioni e tiene due iniziali', () => {
      expect(stampInitials('Cammino dei Tre Villaggi')).toBe('TV');
      expect(stampInitials('Cammino dei Mille')).toBe('M');
      expect(stampInitials('Via Francigena del Sud')).toBe('VF');
      expect(stampInitials("Cammino d'Abruzzo")).toBe('A');
      expect(stampInitials('Vie e Cammini di San Francesco')).toBe('VS');
    });

    it('con un nome fatto solo di parole saltate usa la prima lettera', () => {
      expect(stampInitials('Cammino')).toBe('C');
    });

    it('vuoto senza nome', () => {
      expect(stampInitials(null)).toBe('');
      expect(stampInitials('')).toBe('');
    });
  });

  describe('passportStamps', () => {
    it('in corso per percentuale, poi completati, poi non iniziati, nell\'ordine della config', () => {
      const layers = [layer(1), layer(2), layer(3), layer(4), layer(5)];
      const routes = new Map([
        [2, route(2, 30)],
        [3, route(3, 100, true)],
        [4, route(4, 60)],
        [5, route(5, 30)],
      ]);

      expect(passportStamps(layers, routes).map(s => s.layerId)).toEqual([4, 2, 5, 3, 1]);
    });

    it('un cammino di /api/passport senza layer in config non compare', () => {
      const stamps = passportStamps([layer(1)], new Map([[9, route(9, 50)]]));

      expect(stamps.map(s => s.layerId)).toEqual([1]);
    });

    it('non iniziato: zero tappe, totale da attributes.stage_count o null', () => {
      const [withCount, withoutCount] = passportStamps([layer(1, 6), layer(2)], new Map());

      expect(withCount).toEqual({
        layerId: 1,
        title: 'Cammino 1',
        logo: 'logo-1.png',
        image: 'img-1.jpg',
        status: 'not_started',
        validated: 0,
        total: 6,
        percent: 0,
      });
      expect(withoutCount.total).toBeNull();
    });

    it('in corso e completato: tappe e percentuale da /api/passport', () => {
      const stamps = passportStamps([layer(1), layer(2)], new Map([[1, route(1, 40)], [2, route(2, 100, true)]]));

      expect(stamps.map(s => [s.status, s.validated, s.total, s.percent])).toEqual([
        ['in_progress', 4, 10, 40],
        ['completed', 10, 10, 100],
      ]);
    });

    it('senza config non ci sono timbri', () => {
      expect(passportStamps(undefined, new Map())).toEqual([]);
    });
  });

  describe('routeShareFileName', () => {
    it('nome del cammino come slug', () => {
      expect(routeShareFileName('Via degli Dei', 4)).toBe('via-degli-dei.png');
    });

    it('senza nome ripiega sull\'id', () => {
      expect(routeShareFileName('', 4)).toBe('cammino-4.png');
    });
  });
});

describe('passport.utils, cammino completato (oc:8703)', () => {
  const done = (trackId: number, completedAt: string, distance = 10, source: 'manual' | 'gps' = 'gps'): PassportStage => ({
    trackId,
    name: {},
    status: 'completed',
    distance,
    completedAt,
    source,
  });

  it('latestCompletedAt: la data più recente', () => {
    const stages = [done(1, '2026-04-10T10:00:00Z'), done(2, '2026-04-12T08:00:00Z'), done(3, '2026-04-11T10:00:00Z')];

    expect(latestCompletedAt(stages)).toBe('2026-04-12T08:00:00Z');
  });

  it('latestCompletedAt: null senza date', () => {
    expect(latestCompletedAt([{...done(1, ''), completedAt: undefined}])).toBeNull();
  });

  it('totalDistanceKm: somma arrotondata a 0,1', () => {
    expect(totalDistanceKm([done(1, 'x', 20.4), done(2, 'x', 15.1)])).toBe(35.5);
  });

  it('totalDistanceKm: null se una tappa vale 0 o senza tappe', () => {
    expect(totalDistanceKm([done(1, 'x', 20.4), done(2, 'x', 0)])).toBeNull();
    expect(totalDistanceKm([])).toBeNull();
  });

  it('gpsOutings: giorni distinti con tutte le tappe gps', () => {
    const stages = [
      done(1, '2026-04-10T08:00:00'),
      done(2, '2026-04-10T17:00:00'),
      done(3, '2026-04-11T09:00:00'),
    ];

    expect(gpsOutings(stages)).toBe(2);
  });

  it('gpsOutings: null con una tappa manuale o non completata', () => {
    expect(gpsOutings([done(1, '2026-04-10T08:00:00'), done(2, '2026-04-11T08:00:00', 10, 'manual')])).toBeNull();
    expect(gpsOutings([done(1, '2026-04-10T08:00:00'), {trackId: 2, name: {}, status: 'not_started', distance: 1}])).toBeNull();
    expect(gpsOutings([])).toBeNull();
  });

  it('passportLongDate: giorno, mese esteso e anno', () => {
    const it = passportLongDate('2026-04-12T10:00:00Z', 'it');

    expect(it).toContain('aprile');
    expect(it).toContain('2026');
    expect(passportLongDate('2026-04-12T10:00:00Z', 'pr')).toContain('abril');
    expect(passportLongDate(undefined, 'it')).toBe('');
  });

  it('passportKm: una cifra decimale nella lingua dell\'app', () => {
    expect(passportKm(35.5, 'it')).toBe('35,5');
    expect(passportKm(35.5, 'en')).toBe('35.5');
    expect(passportKm(130, 'it')).toBe('130');
  });
});
