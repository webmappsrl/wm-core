import {Environment} from '@wm-types/environment';

// Salva i metodi originali di console
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// Dichiara la variabile globale per il debug
declare global {
  interface Window {
    wmDebug: boolean;
    enableDebug: () => void;
    disableDebug: () => void;
  }
}

export function initializeConsoleOverride(environment: any): void {
  // Inizializza wmDebug con il valore dell'environment
  window.wmDebug = environment.debug || false;

  // Funzioni globali per abilitare/disabilitare debug
  window.enableDebug = () => {
    window.wmDebug = true;
    originalConsole.log('🐛 Debug abilitato! I log sono ora visibili.');
  };

  window.disableDebug = () => {
    window.wmDebug = false;
    originalConsole.log('🔇 Debug disabilitato! I log sono ora nascosti.');
  };

  // Override dei metodi console per controllare wmDebug dinamicamente
  console.log = function (message?: any, ...optionalParams: any[]) {
    if (window.wmDebug) {
      originalConsole.log(message, ...optionalParams);
    }
  };

  console.warn = function (message?: any, ...optionalParams: any[]) {
    if (window.wmDebug) {
      originalConsole.warn(message, ...optionalParams);
    }
  };

  console.error = function (message?: any, ...optionalParams: any[]) {
    if (window.wmDebug) {
      originalConsole.error(message, ...optionalParams);
    }
  };

  console.info = function (message?: any, ...optionalParams: any[]) {
    if (window.wmDebug) {
      originalConsole.info(message, ...optionalParams);
    }
  };

  console.debug = function (message?: any, ...optionalParams: any[]) {
    if (window.wmDebug) {
      originalConsole.debug(message, ...optionalParams);
    }
  };
}

// Funzioni di utilità per forzare il log anche in produzione se necessario
export const forceLog = originalConsole.log;
export const forceWarn = originalConsole.warn;
export const forceError = originalConsole.error;
export const forceInfo = originalConsole.info;
export const forceDebug = originalConsole.debug;

// Funzione per ripristinare console originale
export function restoreOriginalConsole(): void {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
}
