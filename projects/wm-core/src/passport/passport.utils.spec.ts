import {PassportStage, PassportStageIndex} from '@wm-types/passport';
import {
  passportShortDate,
  passportStageChip,
  slugify,
  sortStages,
  stageName,
  stageShareFileName,
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
