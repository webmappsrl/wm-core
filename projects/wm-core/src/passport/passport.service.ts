import {Injectable, isDevMode} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, defer, of, throwError} from 'rxjs';
import {delay, distinctUntilChanged, map, switchMap} from 'rxjs/operators';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {layerFeaturesTotalCount} from '@wm-core/store/features/ec/ec.selector';
import {
  PassportCertification,
  PassportCertificationRequest,
  PassportProgress,
  PassportStage,
} from '@wm-types/passport';

/** Chiave `localStorage` del mock delle richieste inviate. Sparisce con il backend reale. */
export const PASSPORT_MOCK_STORAGE_KEY = 'wm-passport-mock-certifications';

/** Latenza simulata delle chiamate mock, per vedere loader e stati intermedi. */
const MOCK_LATENCY_MS = 400;

/**
 * Service del passaporto del camminatore (oc:8166).
 *
 * ⚠️ MOCK: il backend camminiditalia non esiste ancora. Tutte le operazioni sono simulate e
 * verranno sostituite dall'implementazione reale (chiamate HTTP verso `EnvironmentService.origin`)
 * con il ticket backend collegato a oc:8166. Il contratto è in `@wm-types/passport`; componenti e
 * store non devono cambiare quando si sostituisce questo service.
 *
 * Contratto ipotizzato:
 * - progresso: `GET /api/layer/{layer}/progress`
 * - stato richiesta: `GET /api/layer/{layer}/certification`
 * - invio: `POST /api/layer/{layer}/certification` (multipart: `images[]`, `serial_number`, `disclaimer_accepted`)
 */
@Injectable({providedIn: 'root'})
export class PassportService {
  /** Solo mock: se `true` ogni invio fallisce, per provare lo stato di errore. */
  simulateSubmitError = false;

  constructor(private _store: Store) {
    // Solo mock e solo in sviluppo: accesso da console per la verifica manuale.
    if (isDevMode()) (globalThis as any).wmPassportMock = this;
  }

  /**
   * Avanzamento del cammino per l'utente corrente.
   * MOCK: il totale delle tappe è il numero reale di track del layer; le tappe percorse
   * dipendono dall'id del layer (resto della divisione per 3: 0%, parziale, 100%). Lo stream resta
   * aperto: il conteggio delle track può arrivare dopo l'apertura della home del layer.
   *
   * @param layerId Id del layer (cammino).
   * @returns Observable con l'avanzamento del cammino.
   */
  getProgress(layerId: number): Observable<PassportProgress> {
    return this._store.select(layerFeaturesTotalCount).pipe(
      map(counts => counts?.[layerId]?.tracks ?? 0),
      distinctUntilChanged(),
      map(total => this._mockProgress(layerId, total)),
      delay(MOCK_LATENCY_MS),
    );
  }

  /**
   * Progresso da mostrare nel passaporto: `null` se l'utente non è loggato o il layer non ha
   * tappe. È l'unica regola di visibilità per badge e anello del logo, e non fa parte del mock.
   *
   * @param layerId Id del layer, `null` se assente.
   * @returns Observable con il progresso, o `null` se non va mostrato nulla.
   */
  visibleProgress(layerId: number | null): Observable<PassportProgress | null> {
    return this._store.select(isLogged).pipe(
      switchMap(logged => (logged && layerId != null ? this.getProgress(layerId) : of(null))),
      map(p => (p && p.totalStages > 0 ? p : null)),
    );
  }

  /**
   * Stato della richiesta di certificazione per il layer.
   * MOCK: legge le richieste inviate da `localStorage`.
   *
   * @param layerId Id del layer (cammino).
   * @returns Observable con lo stato della richiesta.
   */
  getCertification(layerId: number): Observable<PassportCertification> {
    return defer(() => {
      const submittedAt = this._readMock()[layerId];
      const res: PassportCertification = submittedAt
        ? {layerId, status: 'pending', submittedAt}
        : {layerId, status: 'none'};
      return of(res);
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  /**
   * Invia la richiesta di certificazione.
   * MOCK: non invia nulla, salva in `localStorage` la data di invio per il layer.
   *
   * @param req Richiesta con foto, note opzionali e accettazione del disclaimer.
   * @returns Observable con lo stato della richiesta dopo l'invio.
   */
  submitCertification(req: PassportCertificationRequest): Observable<PassportCertification> {
    return defer(() => {
      if (this.simulateSubmitError) {
        return throwError(() => new Error('Invio simulato fallito (mock oc:8166)'));
      }
      const submittedAt = new Date().toISOString();
      this._writeMock({...this._readMock(), [req.layerId]: submittedAt});
      return of<PassportCertification>({layerId: req.layerId, status: 'pending', submittedAt});
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  /** Solo mock: cancella le richieste simulate salvate. */
  resetMock(): void {
    localStorage.removeItem(PASSPORT_MOCK_STORAGE_KEY);
  }

  /**
   * Solo mock: costruisce un avanzamento fittizio e deterministico.
   *
   * @param layerId Id del layer.
   * @param total Numero di track del layer.
   * @returns Avanzamento fittizio del cammino.
   */
  private _mockProgress(layerId: number, total: number): PassportProgress {
    const bucket = Number(layerId) % 3;
    const completed = bucket === 0 ? 0 : bucket === 1 ? Math.round(total * 0.64) : total;
    const stages: PassportStage[] = Array.from({length: total}, (_, i) => {
      const name = `Tappa ${String(i + 1).padStart(2, '0')}`;
      if (i < completed) {
        return {trackId: i + 1, name, status: 'completed', completedAt: '2026-05-12'};
      }
      if (i === completed && completed > 0) {
        return {trackId: i + 1, name, status: 'in_progress', percent: 60};
      }
      return {trackId: i + 1, name, status: 'not_started'};
    });
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {layerId: Number(layerId), totalStages: total, completedStages: completed, percent, stages};
  }

  /**
   * Solo mock: legge la mappa layerId → data di invio.
   *
   * @returns Mappa delle richieste inviate, vuota se assente o illeggibile.
   */
  private _readMock(): Record<number, string> {
    try {
      return JSON.parse(localStorage.getItem(PASSPORT_MOCK_STORAGE_KEY) ?? '{}') ?? {};
    } catch {
      return {};
    }
  }

  /**
   * Solo mock: salva la mappa layerId → data di invio.
   *
   * @param value Mappa da salvare.
   */
  private _writeMock(value: Record<number, string>): void {
    localStorage.setItem(PASSPORT_MOCK_STORAGE_KEY, JSON.stringify(value));
  }
}
