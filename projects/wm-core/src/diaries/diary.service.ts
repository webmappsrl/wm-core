import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable, InjectionToken, OnDestroy, inject} from '@angular/core';
import {Store, createSelector} from '@ngrx/store';
import {BehaviorSubject, Observable, Subject, combineLatest, concat, from, of, timer} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {isLogged, user} from '@wm-core/store/auth/auth.selectors';
import {online} from '@wm-core/store/network/network.selector';
import {
  clearDiariesCache,
  markDiariesCache,
  synchronizedDiaries,
} from '@wm-core/utils/localForage';
import {
  Diary,
  DiaryDraft,
  DiaryFilter,
  DiariesStatus,
  normalizeDiaryRatings,
} from './diary.model';

/** Elemento della risposta del backend (snake_case). */
interface DiaryResponse {
  id: number;
  uuid: string;
  layer: {id: number; name: string};
  ec_track: {id: number; name: string} | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  photos?: {id: number; url: string; thumbnail: string}[] | null;
  ugc_track_ids?: number[] | null;
  publication_consent?: boolean | null;
  rating_route?: number | null;
  rating_hospitality?: number | null;
  rating_difficulty?: number | null;
  walk_start_date?: string | null;
  walk_end_date?: string | null;
}

/** Stato interno: stato della funzione e lista (vuota se non attiva). */
interface DiariesState {
  status: DiariesStatus;
  list: Diary[];
  /** `true` se, in `offline` o `error`, la lista è la copia salvata sul telefono (anche vuota). */
  saved?: boolean;
}

/**
 * Attesa prima del primo tentativo automatico dopo una lettura fallita con la rete presente
 * (`error`); i successivi raddoppiano (30 s, 60 s, 120 s), al massimo
 * `DIARIES_MAX_AUTO_RETRIES`.
 */
export const DIARIES_RETRY_DELAY = new InjectionToken<number>('DIARIES_RETRY_DELAY', {
  providedIn: 'root',
  factory: () => 30000,
});

/**
 * Tentativi automatici consecutivi dopo una lettura fallita: poi si aspetta «Riprova», la rete o
 * un cambio d'utente, che ripartono da zero.
 */
export const DIARIES_MAX_AUTO_RETRIES = 3;

/** Sessione che decide la GET e la chiave della copia offline. */
interface DiariesSession {
  logged: boolean;
  /** Id dell'utente loggato, `null` da non loggato. */
  userId: number | null;
}

/** Login e utente letti insieme: un solo cambio di stato produce una sola emissione. */
export const selectDiariesSession = createSelector(
  isLogged,
  user,
  (logged, current): DiariesSession => ({
    logged: !!logged,
    userId: logged && current?.id != null ? current.id : null,
  }),
);

/**
 * Esperienze dell'utente (oc:8169): lettura, creazione, modifica e cancellazione. Un unico stream
 * condiviso, ricaricato da `refresh()`, al cambio di login o di utente e al ritorno della
 * connessione. La GET parte alla prima sottoscrizione, cioè solo quando una sezione delle
 * esperienze è montata: la funzione è accesa dalle varianti camminiditalia (`fileReplacements`),
 * non da un controllo sullo shard.
 *
 * Offline: ogni GET riuscita della lista `mine` salva una copia sul telefono, una chiave per
 * utente; senza rete lo stato è `offline` e la lista è quella copia; con la rete ma la GET fallita
 * è `error`, con la stessa copia e al massimo tre tentativi automatici (30, 60, 120 s). Creazione,
 * modifica e cancellazione aggiornano subito la copia. La copia si svuota al logout e al cambio
 * d'utente (anche dall'effect di logout, se il service non è mai nato).
 */
@Injectable({providedIn: 'root'})
export class DiaryService implements OnDestroy {
  private _refresh$ = new BehaviorSubject<void>(undefined);
  private _state$: Observable<DiariesState>;
  /** Utente dell'ultima sessione vista, per svuotare la copia offline quando cambia. */
  private _lastUserId: number | null = null;
  /** Operazioni sulla copia offline, eseguite in fila nell'ordine in cui sono chieste. */
  private _cacheQueue: Promise<void> = Promise.resolve();
  private _destroy$ = new Subject<void>();
  private _retryDelay = inject(DIARIES_RETRY_DELAY);

  constructor(
    private _store: Store,
    private _http: HttpClient,
    private _environmentSvc: EnvironmentService,
  ) {
    // segnale di rete già monitorato dall'app (`NetworkService` → store `network`)
    const online$ = this._store.select(online).pipe(
      map(value => value !== false),
      distinctUntilChanged(),
    );
    this._state$ = this._store.select(selectDiariesSession).pipe(
      distinctUntilChanged((a, b) => a.logged === b.logged && a.userId === b.userId),
      tap(session => this._onSessionChange(session)),
      // il login non cambia la chiamata, ma la rilancia (il token dell'interceptor cambia)
      switchMap(session =>
        combineLatest([this._refresh$, online$]).pipe(
          // senza rete non si tenta la GET: si mostra la copia salvata; al ritorno della rete
          // `online$` riemette e la lista si ricarica da sola
          switchMap(([, isOnline]) =>
            isOnline ? this._load(session.userId) : this._fromCache(session.userId),
          ),
          startWith<DiariesState>({status: 'loading', list: []}),
        ),
      ),
      takeUntil(this._destroy$),
      // service singleton: lo stato resta fra un montaggio e l'altro, senza rifare la GET
      shareReplay({bufferSize: 1, refCount: false}),
    );
  }

  /** Ferma lo stream (e il tentativo programmato) quando l'injector viene distrutto. */
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Utente loggato secondo lo store (null se non loggato): serve a bozze e coda per sapere di chi sono.
   * @returns id dell'utente corrente
   */
  currentUserId$(): Observable<number | null> {
    return this._store.select(selectDiariesSession).pipe(
      map(session => session.userId),
      take(1),
    );
  }

  /**
   * Crea un'esperienza e ricarica lo stream.
   * @param draft dati dell'esperienza
   */
  create(draft: DiaryDraft): Observable<Diary> {
    return this._http
      .post<DiaryResponse | {data: DiaryResponse}>(
        `${this._environmentSvc.origin}/api/diaries`,
        this._toFormData(draft, false),
      )
      .pipe(
        map(res => this._toDiary(this._unwrap(res))),
        tap(created => {
          this._patchCache(list => [created, ...list.filter(e => e.id !== created.id)]);
          this.refresh();
        }),
      );
  }

  /**
   * Esperienze filtrate per cammino (tappe comprese), tappa o registrazione.
   * @param filter filtro; `scope` è ignorato (solo `mine`)
   */
  diaries$(filter: DiaryFilter = {}): Observable<Diary[]> {
    return this._state$.pipe(
      map(state =>
        state.list.filter(
          e =>
            (filter.layerId == null || e.layer.id === filter.layerId) &&
            (filter.ecTrackId == null || e.ecTrack?.id === filter.ecTrackId) &&
            (filter.ugcTrackId == null || e.ugcTrackIds.includes(filter.ugcTrackId)),
        ),
      ),
    );
  }

  /** Rilegge le esperienze dal backend. */
  refresh(): void {
    this._refresh$.next();
  }

  /**
   * Cancella un'esperienza e ricarica lo stream.
   * @param id id dell'esperienza
   */
  remove(id: number): Observable<void> {
    return this._http
      .delete<void>(`${this._environmentSvc.origin}/api/diaries/${id}`)
      .pipe(
        map(() => undefined),
        tap(() => {
          this._patchCache(list => list.filter(e => e.id !== id));
          this.refresh();
        }),
      );
  }

  /**
   * Indica se, senza dati freschi, c'è una copia salvata da mostrare (anche vuota).
   *
   * @returns `true` con lo stato `offline` o `error` e una copia sul telefono.
   */
  savedCopy$(): Observable<boolean> {
    return this._state$.pipe(
      map(state => (state.status === 'offline' || state.status === 'error') && state.saved === true),
    );
  }

  /**
   * Stato della funzione: `active`, `login-required` (401), `off` (solo 404), `offline` (rete
   * assente) oppure `error` (rete presente, lettura fallita).
   */
  status$(): Observable<DiariesStatus> {
    return this._state$.pipe(map(state => state.status));
  }

  /**
   * Modifica un'esperienza e ricarica lo stream. `keep_media_ids` è sempre inviato.
   * @param id id dell'esperienza
   * @param draft dati aggiornati
   */
  update(id: number, draft: DiaryDraft): Observable<Diary> {
    return this._http
      .post<DiaryResponse | {data: DiaryResponse}>(
        `${this._environmentSvc.origin}/api/diaries/${id}`,
        this._toFormData(draft, true),
      )
      .pipe(
        map(res => this._toDiary(this._unwrap(res))),
        tap(updated => {
          this._patchCache(list => list.map(e => (e.id === updated.id ? updated : e)));
          this.refresh();
        }),
      );
  }

  /** Chiave della copia offline: solo la lista `mine` dell'utente, mai `all`. */
  private _cacheKey(userId: number): string {
    return `mine:${userId}`;
  }

  /**
   * Accoda un'operazione sulla copia offline: le scritture della GET, le modifiche dopo una
   * mutazione e le pulizie non si sorpassano.
   *
   * @param op Operazione da eseguire.
   */
  private _enqueueCache(op: () => Promise<unknown>): void {
    this._cacheQueue = this._cacheQueue.then(op).then(
      () => undefined,
      () => undefined,
    );
  }

  /**
   * Stato senza dati freschi, con la copia salvata dell'utente se c'è.
   *
   * @param userId Id dell'utente, `null` da non loggato (nessuna copia).
   * @param status `offline` (rete assente) o `error` (lettura fallita).
   * @returns Lo stato, con `saved` se la copia esiste.
   */
  private _fromCache(
    userId: number | null,
    status: 'offline' | 'error' = 'offline',
  ): Observable<DiariesState> {
    if (userId == null) return of<DiariesState>({status, list: [], saved: false});
    return from(
      synchronizedDiaries.getItem<Diary[]>(this._cacheKey(userId)).catch(() => null),
    ).pipe(
      map(
        (list): DiariesState =>
          Array.isArray(list) ? {status, list, saved: true} : {status, list: [], saved: false},
      ),
    );
  }

  /**
   * Aggiorna subito la copia offline dopo una creazione, modifica o cancellazione riuscita, senza
   * aspettare la GET che segue. Se la copia non c'è non la crea.
   *
   * @param change Trasformazione della lista salvata.
   */
  private _patchCache(change: (list: Diary[]) => Diary[]): void {
    const userId = this._lastUserId;
    if (userId == null) return;
    const key = this._cacheKey(userId);
    this._enqueueCache(async () => {
      const list = await synchronizedDiaries.getItem<Diary[]>(key);
      if (!Array.isArray(list) || this._lastUserId !== userId) return;
      markDiariesCache();
      await synchronizedDiaries.setItem(key, change(list));
    });
  }

  /**
   * Salva la lista `mine` letta dal backend sotto la chiave dell'utente. Se nel frattempo
   * l'utente è cambiato (logout durante la scrittura), la chiave appena scritta si toglie.
   *
   * @param userId Utente della lettura.
   * @param list Lista letta.
   */
  private _writeCache(userId: number, list: Diary[]): void {
    const key = this._cacheKey(userId);
    this._enqueueCache(async () => {
      // il marcatore si mette in fila, dopo un'eventuale pulizia che lo toglie
      markDiariesCache();
      await synchronizedDiaries.setItem(key, list);
      if (this._lastUserId !== userId) await synchronizedDiaries.removeItem(key);
    });
  }

  /**
   * Legge lo stato dal backend, anche da non loggato (l'interruttore risponde 404 senza token).
   * 401 → `login-required`; 404 → `off` (la funzione è spenta: la copia offline si scarta);
   * ogni altro errore (5xx, gateway, timeout, status 0 con il segnale di rete ancora «online») →
   * `error` con la copia salvata, e un nuovo tentativo automatico dopo `DIARIES_RETRY_DELAY`,
   * raddoppiato a ogni fallimento, fino a `DIARIES_MAX_AUTO_RETRIES` consecutivi; poi più
   * nulla. `refresh()`, il cambio di rete o di utente annullano il tentativo in attesa e
   * ripartono da zero (rilanciano `_load` con `attempt` 0).
   *
   * @param userId Id dell'utente loggato: la lista letta si salva sotto la sua chiave.
   * @param attempt Tentativi automatici già fatti dopo l'ultima lettura chiesta.
   * @returns Lo stato letto.
   */
  private _load(userId: number | null, attempt = 0): Observable<DiariesState> {
    return this._http
      .get<{data: DiaryResponse[]}>(`${this._environmentSvc.origin}/api/diaries`)
      .pipe(
        map(
          (res): DiariesState => ({
            status: 'active',
            list: (res?.data ?? []).map(item => this._toDiary(item)),
          }),
        ),
        tap(state => {
          // la GET legge solo `mine` (le esperienze dell'utente): è l'unica lista che si salva
          if (userId != null) this._writeCache(userId, state.list);
        }),
        catchError((err: HttpErrorResponse) => {
          if (err?.status === 401) return of<DiariesState>({status: 'login-required', list: []});
          if (err?.status === 404) {
            this._enqueueCache(() => clearDiariesCache());
            return of<DiariesState>({status: 'off', list: []});
          }
          const cached$ = this._fromCache(userId, 'error');
          if (attempt >= DIARIES_MAX_AUTO_RETRIES) return cached$;
          return concat(
            cached$,
            timer(this._retryDelay * 2 ** attempt).pipe(
              switchMap(() => this._load(userId, attempt + 1)),
            ),
          );
        }),
      );
  }

  /**
   * Al logout o al cambio d'utente svuota la copia offline dell'utente precedente.
   *
   * @param session Nuova sessione.
   */
  private _onSessionChange(session: DiariesSession): void {
    const previous = this._lastUserId;
    this._lastUserId = session.userId;
    if (previous != null && previous !== session.userId) {
      this._enqueueCache(() => clearDiariesCache());
    }
  }

  /** Estensione del file ricavata dal MIME type del blob (`jpg` se sconosciuto). */
  private _extension(blob: Blob): string {
    const sub = (blob.type || '').split('/')[1]?.split(';')[0]?.toLowerCase();
    if (!sub) return 'jpg';
    return sub === 'jpeg' ? 'jpg' : sub;
  }

  /** Costruisce il multipart del backend. */
  private _toFormData(draft: DiaryDraft, edit: boolean): FormData {
    const form = new FormData();
    if (!edit) {
      form.append('uuid', draft.uuid);
      if (draft.layerId != null) form.append('layer_id', String(draft.layerId));
      if (draft.ecTrackId != null) form.append('ec_track_id', String(draft.ecTrackId));
    }
    form.append('description', draft.description ?? '');
    form.append('publication_consent', draft.publicationConsent ? '1' : '0');
    // sempre tutte e tre: la stringa vuota azzera una valutazione tolta in modifica
    const ratings = normalizeDiaryRatings(draft.ratings);
    form.append('rating_route', ratings.route != null ? String(ratings.route) : '');
    form.append('rating_hospitality', ratings.hospitality != null ? String(ratings.hospitality) : '');
    form.append('rating_difficulty', ratings.difficulty != null ? String(ratings.difficulty) : '');
    // date di percorrenza (ciclo 4): solo se il campo è stato toccato; vuote lo svuotano
    if (draft.walkDates !== undefined) {
      form.append('walk_start_date', draft.walkDates?.start ?? '');
      form.append('walk_end_date', draft.walkDates?.end ?? '');
    }
    (draft.newPhotos ?? []).forEach((photo, i) =>
      form.append('images[]', photo, `photo-${i}.${this._extension(photo)}`),
    );
    if (edit) {
      form.append('keep_media_ids', JSON.stringify(draft.keepMediaIds ?? []));
    }
    return form;
  }

  /** Mappa l'elemento snake_case del backend sull'interfaccia `Diary`. */
  private _toDiary(item: DiaryResponse): Diary {
    return {
      id: item.id,
      uuid: item.uuid,
      layer: item.layer,
      ecTrack: item.ec_track ?? null,
      description: item.description ?? null,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      photos: item.photos ?? [],
      ugcTrackIds: item.ugc_track_ids ?? [],
      publicationConsent: item.publication_consent === true,
      ratings: normalizeDiaryRatings({
        route: item.rating_route,
        hospitality: item.rating_hospitality,
        difficulty: item.rating_difficulty,
      }),
      walkDates: item.walk_start_date
        ? {start: item.walk_start_date, end: item.walk_end_date ?? item.walk_start_date}
        : null,
    };
  }

  /** Il backend può rispondere con l'elemento nudo o dentro `data`. */
  private _unwrap(res: DiaryResponse | {data: DiaryResponse}): DiaryResponse {
    return (res as {data?: DiaryResponse}).data ?? (res as DiaryResponse);
  }
}
