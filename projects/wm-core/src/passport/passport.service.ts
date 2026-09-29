import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of, throwError} from 'rxjs';
import {catchError, delay, distinctUntilChanged, map, switchMap} from 'rxjs/operators';
import {layerFeaturesTotalCount} from '@wm-core/store/features/ec/ec.selector';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {
  PassportCertification,
  PassportCertificationRequest,
  PassportProgress,
  PassportStage,
} from '@wm-types/passport';

/** Latenza simulata del progresso mock, per vedere il loader. */
const MOCK_LATENCY_MS = 400;

/** Risposta del backend camminiditalia per stato e invio della richiesta di certificazione. */
interface CertificationResponse {
  status: string;
  submitted_at?: string;
}

/** Estensione del nome file per tipo MIME, fra quelli accettati dal backend. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Service del passaporto del camminatore (oc:8166).
 *
 * Stato e invio della richiesta di certificazione usano il backend camminiditalia
 * (`CertificationRequestController`), con il token aggiunto da `AuthInterceptor`:
 * - `GET /api/layer/{layer}/certification` → `{status: "none"}` oppure `{status: "pending", submitted_at}`
 * - `POST /api/layer/{layer}/certification` (multipart: `images[]`, `serial_number`,
 *   `disclaimer_accepted`) → 201 `{status, submitted_at}`, 409 se c'è già una richiesta in attesa.
 *
 * ⚠️ MOCK: il progresso delle tappe è ancora simulato, perché il backend non ha una rotta per
 * il progresso (dipende da oc:8165). Il contratto è in `@wm-types/passport`: quando la rotta
 * esisterà cambierà solo `getProgress`, non componenti né store.
 */
@Injectable({providedIn: 'root'})
export class PassportService {
  constructor(
    private _store: Store,
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
  ) {}

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
   * tappe. È l'unica regola di visibilità per badge e anello del logo.
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
   * Stato della richiesta di certificazione dell'utente per il layer.
   *
   * @param layerId Id del layer (cammino).
   * @returns Observable con lo stato della richiesta.
   */
  getCertification(layerId: number): Observable<PassportCertification> {
    return this._http
      .get<CertificationResponse>(this._certificationUrl(layerId))
      .pipe(map(res => this._toCertification(layerId, res)));
  }

  /**
   * Invia la richiesta di certificazione. Un 409 vuol dire che una richiesta è già in attesa: si
   * rilegge lo stato e lo si restituisce, così l'utente vede «In revisione» e non un errore.
   *
   * @param req Richiesta con foto, numero seriale opzionale e accettazione del disclaimer.
   * @returns Observable con lo stato della richiesta dopo l'invio.
   */
  submitCertification(req: PassportCertificationRequest): Observable<PassportCertification> {
    return this._http
      .post<CertificationResponse>(this._certificationUrl(req.layerId), this._toFormData(req))
      .pipe(
        map(res => this._toCertification(req.layerId, res)),
        catchError((err: unknown) =>
          err instanceof HttpErrorResponse && err.status === 409
            ? this.getCertification(req.layerId)
            : throwError(() => err),
        ),
      );
  }

  /**
   * URL della rotta di certificazione del layer.
   *
   * @param layerId Id del layer.
   * @returns L'URL assoluto.
   */
  private _certificationUrl(layerId: number): string {
    return `${this._environmentSvc.origin}/api/layer/${layerId}/certification`;
  }

  /**
   * Converte la risposta del backend nel tipo del frontend. Gli stati che il frontend non gestisce
   * ancora (approvata, rifiutata) valgono come «nessuna richiesta».
   *
   * @param layerId Id del layer.
   * @param res Risposta del backend.
   * @returns Lo stato della richiesta.
   */
  private _toCertification(layerId: number, res: CertificationResponse): PassportCertification {
    return res?.status === 'pending'
      ? {layerId, status: 'pending', submittedAt: res.submitted_at}
      : {layerId, status: 'none'};
  }

  /**
   * Costruisce il multipart della richiesta.
   *
   * @param req Richiesta di certificazione.
   * @returns Il corpo multipart.
   */
  private _toFormData(req: PassportCertificationRequest): FormData {
    const data = new FormData();
    req.photos.forEach((photo, index) => {
      const ext = EXTENSION_BY_TYPE[photo.type] ?? 'jpg';
      data.append('images[]', photo, `credenziale_${index + 1}.${ext}`);
    });
    if (req.serialNumber) {
      data.append('serial_number', req.serialNumber);
    }
    data.append('disclaimer_accepted', '1');
    return data;
  }

  /**
   * MOCK: costruisce un avanzamento fittizio e deterministico.
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
}
