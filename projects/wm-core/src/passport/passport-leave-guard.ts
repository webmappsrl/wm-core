/** Componente in primo piano nella modale del passaporto che può impedire l'uscita (oc:8166). */
export interface PassportLeaveGuard {
  canLeave(): Promise<boolean>;
}
