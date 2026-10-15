import {
  GpsStatusEvent,
  GpsStatusState,
  initialGpsStatusState,
  reduceGpsStatus,
} from './gps-status';

/** Applica in sequenza una lista di eventi a partire da uno stato. */
function run(state: GpsStatusState, events: GpsStatusEvent[]): GpsStatusState {
  return events.reduce((s, e) => reduceGpsStatus(s, e), state);
}

/** Stato di partenza con lo status indicato e i contatori a zero. */
function at(status: GpsStatusState['status']): GpsStatusState {
  return {status, poorStreak: 0, goodSince: null};
}

const fix = (accuracy: number | null | undefined, time = 0): GpsStatusEvent => ({
  type: 'fix',
  accuracy,
  time,
});

describe('reduceGpsStatus', () => {
  it('lo stato iniziale è off', () => {
    expect(initialGpsStatusState()).toEqual({status: 'off', poorStreak: 0, goodSince: null});
  });

  it('start porta in searching da ogni stato', () => {
    const poor: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: 100};
    expect(reduceGpsStatus(at('off'), {type: 'start'})).toEqual(at('searching'));
    expect(reduceGpsStatus(poor, {type: 'start'})).toEqual(at('searching'));
    expect(reduceGpsStatus(at('denied'), {type: 'start'})).toEqual(at('searching'));
  });

  it('stop porta in off', () => {
    const poor: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: 100};
    expect(reduceGpsStatus(poor, {type: 'stop'})).toEqual(at('off'));
  });

  it('il primo fix porta da searching a ok', () => {
    expect(reduceGpsStatus(at('searching'), fix(12)).status).toBe('ok');
  });

  it('due fix sopra 50 m di fila portano in poor', () => {
    const s = run(at('searching'), [fix(51), fix(80)]);
    expect(s.status).toBe('poor');
    expect(s.goodSince).toBeNull();
  });

  it('un fix sopra 50 seguito da uno sotto non porta in poor', () => {
    const s = run(at('searching'), [fix(80), fix(20), fix(80)]);
    expect(s.status).toBe('ok');
    expect(s.poorStreak).toBe(1);
  });

  it('fra 30 e 50 m lo stato non cambia', () => {
    expect(reduceGpsStatus(at('ok'), fix(45)).status).toBe('ok');
    const poor = reduceGpsStatus({status: 'poor', poorStreak: 2, goodSince: null}, fix(45));
    expect(poor.status).toBe('poor');
    expect(poor.goodSince).toBeNull();
  });

  it('esce da poor dopo 15 s sotto i 30 m', () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: null};
    const before = run(start, [fix(10, 0), fix(10, 14999)]);
    expect(before.status).toBe('poor');
    expect(before.goodSince).toBe(0);
    const after = reduceGpsStatus(before, fix(10, 15000));
    expect(after).toEqual(at('ok'));
  });

  it("un fix a 30 m o più azzera il timer d'uscita", () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: null};
    const s = run(start, [fix(10, 0), fix(35, 5000), fix(10, 16000)]);
    expect(s.status).toBe('poor');
    expect(s.goodSince).toBe(16000);
    expect(reduceGpsStatus(start, fix(30, 0)).goodSince).toBeNull();
  });

  it('il tick fa uscire da poor anche senza altri fix', () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: null};
    const s = run(start, [fix(10, 0), {type: 'tick', time: 15000}]);
    expect(s).toEqual(at('ok'));
  });

  it('il tick prima dei 15 s non cambia nulla', () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: 0};
    expect(reduceGpsStatus(start, {type: 'tick', time: 14999})).toEqual(start);
  });

  it('il tick senza goodSince non cambia nulla', () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: null};
    expect(reduceGpsStatus(start, {type: 'tick', time: 99999})).toEqual(start);
  });

  it('accuracy non numerica non porta in poor', () => {
    for (const acc of [null, undefined, NaN]) {
      const s = run(at('searching'), [fix(acc), fix(acc)]);
      expect(s.status).toBe('ok');
      expect(s.poorStreak).toBe(0);
    }
  });

  it('accuracy non numerica in poor non tocca il timer', () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: 0};
    expect(reduceGpsStatus(start, fix(null, 20000))).toEqual(start);
  });

  it('un errore dopo lo stop resta off', () => {
    const native: GpsStatusEvent = {type: 'nativeError', code: 'NOT_AUTHORIZED', message: 'Permission denied.'};
    expect(reduceGpsStatus(at('off'), native)).toEqual(at('off'));
    expect(reduceGpsStatus(at('off'), {type: 'webError', code: 1})).toEqual(at('off'));
  });

  it('un fix dopo lo stop resta off', () => {
    expect(reduceGpsStatus(at('off'), fix(10))).toEqual(at('off'));
  });

  it('NOT_AUTHORIZED con Location services disabled porta in disabled', () => {
    const s = reduceGpsStatus(at('ok'), {
      type: 'nativeError',
      code: 'NOT_AUTHORIZED',
      message: 'Location services disabled.',
    });
    expect(s).toEqual(at('disabled'));
  });

  it('NOT_AUTHORIZED con altro messaggio porta in denied', () => {
    const s = reduceGpsStatus(at('searching'), {
      type: 'nativeError',
      code: 'NOT_AUTHORIZED',
      message: 'Permission denied.',
    });
    expect(s).toEqual(at('denied'));
  });

  it('un errore nativo senza codice non cambia lo stato', () => {
    const poor: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: 100};
    const err: GpsStatusEvent = {type: 'nativeError', message: 'The operation could not be completed'};
    expect(reduceGpsStatus(at('ok'), err)).toEqual(at('ok'));
    expect(reduceGpsStatus(poor, err)).toEqual(poor);
  });

  it('NOT_AUTHORIZED in poor con il timer avviato porta in denied, e il tick non lo riporta a ok', () => {
    const start: GpsStatusState = {status: 'poor', poorStreak: 2, goodSince: 0};
    const s = run(start, [
      {type: 'nativeError', code: 'NOT_AUTHORIZED', message: 'Permission denied.'},
      {type: 'tick', time: 20000},
    ]);
    expect(s).toEqual(at('denied'));
  });

  it('errori web: 1 → denied, 2 → disabled, 3 → invariato', () => {
    expect(reduceGpsStatus(at('searching'), {type: 'webError', code: 1}).status).toBe('denied');
    expect(reduceGpsStatus(at('searching'), {type: 'webError', code: 2}).status).toBe('disabled');
    expect(reduceGpsStatus(at('searching'), {type: 'webError', code: 3})).toEqual(at('searching'));
  });

  it('un fix dopo denied porta in ok', () => {
    expect(reduceGpsStatus(at('denied'), fix(10)).status).toBe('ok');
    expect(reduceGpsStatus(at('disabled'), fix(10)).status).toBe('ok');
  });

  it('non muta lo stato ricevuto', () => {
    const start = Object.freeze({status: 'ok', poorStreak: 1, goodSince: null}) as GpsStatusState;
    expect(() => reduceGpsStatus(start, fix(80))).not.toThrow();
    expect(start.poorStreak).toBe(1);
  });
});
