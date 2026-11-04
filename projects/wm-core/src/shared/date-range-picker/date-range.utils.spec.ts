import {DateRange, daysBetween, describeDateRange, formatDateRange, nextRange} from './date-range.utils';

describe('calendario a intervallo (oc:8169, ciclo 4)', () => {
  it('primo tocco inizio, secondo fine, terzo ricomincia', () => {
    let step = nextRange(null, 'start', '2026-05-10');
    expect(step).toEqual({range: {start: '2026-05-10', end: '2026-05-10'}, picking: 'end'});
    step = nextRange(step.range, step.picking, '2026-05-12');
    expect(step).toEqual({range: {start: '2026-05-10', end: '2026-05-12'}, picking: 'start'});
    step = nextRange(step.range, step.picking, '2026-06-01');
    expect(step).toEqual({range: {start: '2026-06-01', end: '2026-06-01'}, picking: 'end'});
  });

  it('una fine prima dell\'inizio si scambia', () => {
    const step = nextRange({start: '2026-05-10', end: '2026-05-10'}, 'end', '2026-05-08');
    expect(step.range).toEqual({start: '2026-05-08', end: '2026-05-10'});
  });

  it('lo stesso giorno toccato due volte chiude un intervallo di un giorno', () => {
    const step = nextRange({start: '2026-05-10', end: '2026-05-10'}, 'end', '2026-05-10');
    expect(step).toEqual({range: {start: '2026-05-10', end: '2026-05-10'}, picking: 'start'});
  });

  it('i giorni in mezzo, estremi esclusi', () => {
    expect(daysBetween({start: '2026-04-29', end: '2026-05-02'})).toEqual(['2026-04-30', '2026-05-01']);
    expect(daysBetween({start: '2026-05-10', end: '2026-05-10'})).toEqual([]);
  });

  it('formati del campo: stesso mese, due mesi, due anni, un giorno', () => {
    const f = (r: DateRange | null) => formatDateRange(r, 'it');
    expect(f({start: '2026-05-10', end: '2026-05-12'})).toBe('10 – 12 maggio 2026');
    expect(f({start: '2026-04-30', end: '2026-05-02'})).toBe('30 aprile – 2 maggio 2026');
    expect(f({start: '2025-12-30', end: '2026-01-02'})).toBe('30 dicembre 2025 – 2 gennaio 2026');
    expect(f({start: '2026-05-10', end: '2026-05-10'})).toBe('10 maggio 2026');
    expect(f(null)).toBe('');
  });

  it('testo sotto il calendario', () => {
    expect(describeDateRange({start: '2026-05-10', end: '2026-05-12'}, 'it')).toEqual({key: 'Dal {{from}} al {{to}}', params: {from: '10 maggio', to: '12 maggio'}});
    expect(describeDateRange({start: '2026-05-10', end: '2026-05-10'}, 'it')).toEqual({key: 'Solo il {{day}}', params: {day: '10 maggio'}});
  });
});
