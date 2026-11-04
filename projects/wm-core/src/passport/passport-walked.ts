/**
 * Km e giorni percorsi dall'utente (oc:8169, ciclo 2), letti da `GET /api/layer/{layer}/progress`
 * per la scheda dati del diario. Estendono i tipi di `@wm-types/passport` da qui, in attesa di
 * spostarli in wm-types: un backend vecchio non li manda e restano assenti.
 */
declare module '@wm-types/passport' {
  interface PassportStage {
    /** Km delle registrazioni dell'utente su questa tappa, `null` se non applicabile. */
    userDistance?: number | null;
    /** Giorni (`Y-m-d`) in cui l'utente ha percorso la tappa; vuoto se non si sanno. */
    walkedDates?: string[];
  }

  interface PassportProgress {
    /** Km percorsi dall'utente sul cammino, `null` senza tappe validate. */
    userDistanceTotal?: number | null;
  }
}

export {};
