/** Componente in primo piano nella modale del passaporto che può impedire l'uscita (oc:8166). */
export interface PassportLeaveGuard {
  canLeave(): Promise<boolean>;
  /**
   * Chiude un overlay aperto dalla pagina (per esempio il calendario delle date, oc:8761).
   *
   * @returns `true` se ha chiuso qualcosa.
   */
  closeOverlay?(): Promise<boolean>;
}
