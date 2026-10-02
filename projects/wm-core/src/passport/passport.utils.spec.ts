import {PassportStage} from '@wm-types/passport';
import {passportShortDate, sortStages, stageName} from './passport.utils';

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
});
