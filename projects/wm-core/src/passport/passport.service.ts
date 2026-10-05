import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {App} from '@capacitor/app';
import {PluginListenerHandle} from '@capacitor/core';
import {merge, Observable, of, Subject, throwError} from 'rxjs';
import {catchError, filter, map, shareReplay, switchMap, tap} from 'rxjs/operators';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {LangService} from '@wm-core/localization/lang.service';
import {
  PassportCertification,
  PassportCertificationRequest,
  PassportCertificationStatus,
  PassportProgress,
  PassportStage,
  PassportStageSource,
  PassportStageStatus,
} from '@wm-types/passport';

/** Risposta del backend camminiditalia a `GET /api/layer/{layer}/progress` (oc:8676). */
interface ProgressResponse {
  layer_id: number;
  validated: number;
  total: number;
  percentage: number;
  completed: boolean;
  tracks: Array<{
    id: number;
    name?: PassportStage['name'] | null;
    distance?: number | null;
    status: string;
    progress?: number | null;
    validated_at?: string | null;
    source?: string | null;
  }>;
}

/** Risposta del backend camminiditalia per stato e invio della richiesta di certificazione. */
interface CertificationResponse {
  status: string;
  submitted_at?: string;
  decided_at?: string | null;
  decision_note?: string | null;
}

/** Stati della richiesta che il backend può restituire, oltre a `none`. */
const KNOWN_STATUSES: PassportCertificationStatus[] = ['pending', 'approved', 'rejected'];

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
 * - `GET /api/layer/{layer}/certification` → l'ultima richiesta dell'utente per il layer:
 *   `{status: "none"}` oppure `{status: "pending"|"approved"|"rejected", submitted_at, decided_at,
 *   decision_note}` (oc:8671)
 * - `POST /api/layer/{layer}/certification` (multipart: `images[]`, `serial_number`,
 *   `disclaimer_accepted`) → 201 `{status, submitted_at}`, 409 se c'è già una richiesta in attesa.
 *   Porta `Accept-Language` con la lingua dell'app, per la lingua della mail di esito (oc:8671).
 *
 * - `GET /api/layer/{layer}/progress` → le tappe del cammino riconosciute all'utente, con i
 *   conteggi calcolati dal backend (oc:8676). Badge, anello e dettaglio leggono lo stesso stream
 *   per layer (`progress$`).
 */
@Injectable({providedIn: 'root'})
export class PassportService {
  /** Stream condivisi del progresso, uno per layer. */
  private readonly _progressStreams = new Map<number, Observable<PassportProgress | null>>();
  /** Ultimo progresso letto per layer, mostrato se una lettura fallisce. Vive solo in memoria. */
  private readonly _lastProgress = new Map<number, PassportProgress>();
  /** Richieste di rilettura, con l'id del layer. */
  private readonly _progressRefresh$ = new Subject<number>();

  constructor(
    private _store: Store,
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
    private _langSvc: LangService,
  ) {
    // al logout si dimentica l'ultimo progresso: un altro utente sullo stesso dispositivo non deve
    // vedere le tappe del precedente se la sua prima lettura fallisce (oc:8676)
    this._store
      .select(isLogged)
      .pipe(filter(logged => !logged))
      .subscribe(() => this._lastProgress.clear());
  }

  /**
   * Ritorno dell'app in primo piano (oc:8671), per rileggere lo stato della richiesta dopo la mail
   * di esito. Usa il `resume` di `@capacitor/app`, che scatta sul nativo e, nel browser, al cambio
   * di visibilità della pagina. Non `DeviceService.onForeground`: ascolta `document 'resume'`, che
   * nel browser non arriva, ed è un `ReplaySubject(1)` che emetterebbe appena ci si iscrive.
   *
   * @returns Observable che emette a ogni ritorno in primo piano; la disiscrizione rimuove il listener.
   */
  appResume$(): Observable<void> {
    return new Observable<void>(subscriber => {
      const handle = this._addResumeListener(() => subscriber.next());
      return () => {
        handle.then(h => h.remove());
      };
    });
  }

  /**
   * Avanzamento del cammino per l'utente corrente, letto dal backend (oc:8676). Gli errori si
   * propagano: chi mostra il progresso usa `progress$`, che li gestisce.
   *
   * @param layerId Id del layer (cammino).
   * @returns Observable con l'avanzamento del cammino.
   */
  getProgress(layerId: number): Observable<PassportProgress> {
    return this._http
      .get<ProgressResponse>(`${this._environmentSvc.origin}/api/layer/${layerId}/progress`)
      .pipe(map(res => this._toProgress(layerId, res)));
  }

  /**
   * Progresso del layer condiviso fra badge, anello e dettaglio: una sola richiesta per layer
   * finché qualcuno lo guarda. Si rilegge al ritorno dell'app in primo piano e con
   * `refreshProgress`. Se una lettura fallisce emette l'ultimo valore letto nella sessione.
   *
   * @param layerId Id del layer (cammino).
   * @returns Observable con il progresso, `null` se non c'è mai stata una lettura riuscita.
   */
  progress$(layerId: number): Observable<PassportProgress | null> {
    let stream = this._progressStreams.get(layerId);
    if (!stream) {
      stream = merge(
        of(undefined),
        this.appResume$(),
        this._progressRefresh$.pipe(filter(id => id === layerId)),
      ).pipe(
        switchMap(() =>
          this.getProgress(layerId).pipe(
            tap(progress => this._lastProgress.set(layerId, progress)),
            catchError(() => of(this._lastProgress.get(layerId) ?? null)),
          ),
        ),
        shareReplay({bufferSize: 1, refCount: true}),
      );
      this._progressStreams.set(layerId, stream);
    }
    return stream;
  }

  /**
   * Rilegge il progresso del layer per tutti quelli che lo stanno mostrando, per esempio alla
   * chiusura della modale o dopo una rilettura del dettaglio.
   *
   * @param layerId Id del layer (cammino).
   */
  refreshProgress(layerId: number): void {
    this._progressRefresh$.next(layerId);
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
      switchMap(logged => (logged && layerId != null ? this.progress$(layerId) : of(null))),
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
      .post<CertificationResponse>(
        this._certificationUrl(req.layerId),
        this._toFormData(req),
        this._languageOptions(),
      )
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
   * Registra il listener `resume` di Capacitor. Metodo a parte perché `App` è un Proxy di
   * Capacitor, che nei test non si lascia spiare.
   *
   * @param callback Funzione chiamata a ogni ritorno in primo piano.
   * @returns La promise dell'handle del listener.
   */
  private _addResumeListener(callback: () => void): Promise<PluginListenerHandle> {
    return App.addListener('resume', callback);
  }

  /**
   * Opzioni HTTP con la lingua scelta nell'app, da cui il backend sceglie la lingua della mail di
   * esito (oc:8671). Solo per l'invio: un header globale cambierebbe le risposte di ogni backend.
   *
   * @returns Le opzioni con `Accept-Language`, vuote se la lingua non è ancora impostata.
   */
  private _languageOptions(): {headers?: HttpHeaders} {
    const lang = this._langSvc.currentLang;
    return lang ? {headers: new HttpHeaders({'Accept-Language': lang})} : {};
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
   * Converte la risposta del backend nel tipo del frontend. Uno stato sconosciuto vale come
   * «nessuna richiesta»; una nota vuota o di soli spazi come nota assente.
   *
   * @param layerId Id del layer.
   * @param res Risposta del backend.
   * @returns Lo stato della richiesta.
   */
  private _toCertification(layerId: number, res: CertificationResponse): PassportCertification {
    const status = res?.status as PassportCertificationStatus;
    if (!KNOWN_STATUSES.includes(status)) {
      return {layerId, status: 'none'};
    }
    const certification: PassportCertification = {layerId, status, submittedAt: res.submitted_at};
    if (res.decided_at) {
      certification.decidedAt = res.decided_at;
    }
    const note = res.decision_note?.trim();
    if (note) {
      certification.decisionNote = note;
    }
    return certification;
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
   * Converte la risposta del backend nel tipo del frontend (oc:8676): `validated` è una tappa
   * percorsa, `not_validated` con `progress` parziale una tappa in corso (GPS, oc:8165), ogni
   * altro valore una tappa non iniziata. I conteggi restano quelli del backend.
   *
   * @param layerId Id del layer.
   * @param res Risposta del backend.
   * @returns L'avanzamento del cammino.
   */
  private _toProgress(layerId: number, res: ProgressResponse): PassportProgress {
    const stages = (res?.tracks ?? []).map(track => {
      const stage: PassportStage = {
        trackId: track.id,
        name: track.name ?? {},
        status: this._toStageStatus(track.status, track.progress),
        distance: track.distance ?? 0,
      };
      if (stage.status === 'completed') {
        if (track.validated_at) stage.completedAt = track.validated_at;
        if (track.source) stage.source = track.source as PassportStageSource;
      }
      if (stage.status === 'in_progress') stage.percent = track.progress;
      return stage;
    });
    return {
      layerId: Number(layerId),
      totalStages: res?.total ?? 0,
      completedStages: res?.validated ?? 0,
      percent: res?.percentage ?? 0,
      completed: res?.completed === true,
      stages,
    };
  }

  /**
   * Stato di una tappa: il completamento lo decide `status`, mai `progress`.
   *
   * @param status Stato del backend.
   * @param progress Percentuale percorsa, 0-100, se presente.
   * @returns Lo stato della tappa.
   */
  private _toStageStatus(status: string, progress: number | null | undefined): PassportStageStatus {
    if (status === 'validated') return 'completed';
    if (status === 'not_validated' && (progress ?? 0) > 0) return 'in_progress';
    return 'not_started';
  }
}
