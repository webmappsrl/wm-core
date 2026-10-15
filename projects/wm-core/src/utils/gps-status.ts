/**
 * Stato del GPS ricavato dagli eventi del watcher (oc:8766). Funzione pura: nessun timer, nessun
 * plugin; il servizio la alimenta e programma il `tick` d'uscita da `poor`.
 *
 * - `searching`: watcher avviato, nessun fix ancora
 * - `ok` / `poor`: posizione arrivata, precisione buona o scarsa
 * - `denied`: permesso negato (su iOS anche localizzazione spenta, che non si distingue)
 * - `disabled`: localizzazione del telefono spenta (Android e web)
 * - `off`: watcher fermo
 */
export type GpsStatus = 'searching' | 'ok' | 'poor' | 'denied' | 'disabled' | 'off';

/** Sopra questa precisione (metri) un fix conta come scarso. */
export const GPS_POOR_ENTER_ACCURACY = 50;
/** Fix scarsi di fila necessari per entrare in `poor`. */
export const GPS_POOR_ENTER_FIXES = 2;
/** Sotto questa precisione (metri) un fix conta come buono per uscire da `poor`. */
export const GPS_POOR_EXIT_ACCURACY = 30;
/** Durata (ms) di fix buoni necessaria per uscire da `poor`. */
export const GPS_POOR_EXIT_MS = 15000;

/** Codice con cui il plugin nativo segnala permesso negato o localizzazione spenta. */
export const GPS_NOT_AUTHORIZED = 'NOT_AUTHORIZED';
/** Messaggio con cui il plugin Android segnala la localizzazione del telefono spenta. */
export const GPS_LOCATION_DISABLED_MESSAGE = 'Location services disabled.';
/** Codici di `GeolocationPositionError` del browser. */
const WEB_PERMISSION_DENIED = 1;
const WEB_POSITION_UNAVAILABLE = 2;

export interface GpsStatusState {
  status: GpsStatus;
  /** Fix consecutivi sopra `GPS_POOR_ENTER_ACCURACY`. */
  poorStreak: number;
  /** Timestamp (ms) del primo fix sotto `GPS_POOR_EXIT_ACCURACY` mentre si è in `poor`. */
  goodSince: number | null;
}

export type GpsStatusEvent =
  | {type: 'start'}
  | {type: 'stop'}
  | {type: 'fix'; accuracy: number | null | undefined; time: number}
  | {type: 'tick'; time: number}
  | {type: 'nativeError'; code?: string; message?: string}
  /** `GeolocationPositionError.code`: 1 permesso negato, 2 posizione non disponibile, 3 timeout. */
  | {type: 'webError'; code: number};

/**
 * Stato iniziale: watcher fermo.
 * @returns lo stato `off` con i contatori a zero.
 */
export function initialGpsStatusState(): GpsStatusState {
  return {status: 'off', poorStreak: 0, goodSince: null};
}

/**
 * Calcola il nuovo stato del GPS a partire da quello attuale e da un evento.
 * @param state stato attuale, non viene modificato
 * @param event evento del watcher o del timer
 * @returns un nuovo oggetto di stato
 */
export function reduceGpsStatus(state: GpsStatusState, event: GpsStatusEvent): GpsStatusState {
  switch (event.type) {
    case 'start':
      return reset('searching');
    case 'stop':
      return reset('off');
    case 'fix':
      return onFix(state, event.accuracy, event.time);
    case 'tick':
      return state.status === 'poor' && state.goodSince != null ? exitPoorIfElapsed(state, event.time) : {...state};
    case 'nativeError':
      // a watcher fermo un errore può arrivare solo da una callback in ritardo: si ignora
      if (state.status === 'off' || event.code !== GPS_NOT_AUTHORIZED) return {...state};
      return reset(event.message === GPS_LOCATION_DISABLED_MESSAGE ? 'disabled' : 'denied');
    case 'webError':
      if (state.status === 'off') return {...state};
      if (event.code === WEB_PERMISSION_DENIED) return reset('denied');
      if (event.code === WEB_POSITION_UNAVAILABLE) return reset('disabled');
      return {...state};
  }
}

/**
 * Applica un fix allo stato.
 * @param state stato attuale
 * @param accuracy precisione del fix in metri, può mancare
 * @param time timestamp del fix in ms
 * @returns il nuovo stato
 */
function onFix(state: GpsStatusState, accuracy: number | null | undefined, time: number): GpsStatusState {
  const known = isNum(accuracy);
  switch (state.status) {
    case 'off':
      return {...state};
    case 'searching':
    case 'denied':
    case 'disabled':
      return {status: 'ok', poorStreak: known && accuracy > GPS_POOR_ENTER_ACCURACY ? 1 : 0, goodSince: null};
    case 'ok': {
      if (!known) return {...state};
      if (accuracy <= GPS_POOR_ENTER_ACCURACY) return {...state, poorStreak: 0};
      const poorStreak = state.poorStreak + 1;
      return poorStreak >= GPS_POOR_ENTER_FIXES
        ? {status: 'poor', poorStreak, goodSince: null}
        : {...state, poorStreak};
    }
    case 'poor': {
      if (!known) return {...state};
      if (accuracy >= GPS_POOR_EXIT_ACCURACY) return {...state, goodSince: null};
      return exitPoorIfElapsed({...state, goodSince: state.goodSince ?? time}, time);
    }
  }
}

/**
 * Esce da `poor` se i fix sono buoni da almeno `GPS_POOR_EXIT_MS`.
 * @param state stato `poor` con `goodSince` valorizzato
 * @param time istante attuale in ms
 * @returns `ok` azzerato, oppure lo stato invariato
 */
function exitPoorIfElapsed(state: GpsStatusState, time: number): GpsStatusState {
  return time - (state.goodSince as number) >= GPS_POOR_EXIT_MS ? reset('ok') : {...state};
}

/**
 * Stato con lo status indicato e i contatori a zero.
 * @param status nuovo status
 * @returns lo stato azzerato
 */
function reset(status: GpsStatus): GpsStatusState {
  return {status, poorStreak: 0, goodSince: null};
}

/**
 * Vero se il valore è un numero utilizzabile.
 * @param v valore da controllare
 * @returns `true` se è un numero diverso da `NaN`
 */
function isNum(v: number | null | undefined): v is number {
  return typeof v === 'number' && !isNaN(v);
}
