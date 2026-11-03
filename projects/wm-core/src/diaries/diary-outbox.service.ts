import {HttpErrorResponse} from '@angular/common/http';
import {Inject, Injectable, InjectionToken, OnDestroy, Optional} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, Subscription, combineLatest, firstValueFrom} from 'rxjs';
import {distinctUntilChanged, filter, map, pairwise, startWith} from 'rxjs/operators';
import {online} from '@wm-core/store/network/network.selector';
import {deviceDiaryOutbox} from '@wm-core/utils/localForage';
import {DiaryDraft} from './diary.model';
import {DiaryService, selectDiariesSession} from './diary.service';
import {DiaryDraftStore} from './diary-draft.store';
import {diaryHttpErrorKey} from './diary-offline.utils';

/** Giorni dopo cui bozze ed elementi in coda non inviati si cancellano (oc:8169, ciclo 2). */
export const DIARY_RETENTION_DAYS = 90;
/** Attese dopo un errore di rete o un 5xx, in minuti; poi si riprova solo al ritorno della rete. */
export const DIARY_OUTBOX_BACKOFF_MINUTES = [1, 5, 15];
/** Attese in ms (sovrascrivibili nei test). */
export const DIARY_OUTBOX_BACKOFF_MS = new InjectionToken<number[]>('DIARY_OUTBOX_BACKOFF_MS');
/** Messaggio di un diario non accettato dal server: si riapre nel form per correggerlo. */
export const DIARY_OUTBOX_FAILED_MESSAGE = 'Il diario non è stato inviato: aprilo per correggerlo.';

/** Diario nuovo scritto senza rete, in attesa di invio. */
export interface DiaryOutboxItem {
  uuid: string;
  userId: number;
  layerId?: number;
  ecTrackId?: number;
  description: string;
  photos: Blob[];
  publicationConsent: boolean;
  /** `pending` in attesa di invio, `failed` rifiutato dal server (422, 413, 404). */
  status: 'pending' | 'failed';
  errorMessage?: string;
  attempts: number;
  /** Prossimo tentativo (ms); `Infinity` = solo al prossimo ritorno della rete. */
  nextAttemptAt: number;
  updatedAt: number;
}

/**
 * Coda di invio offline dei diari nuovi (oc:8169, ciclo 2). Si avvia solo nella variante
 * camminiditalia dell'app (`tabs.page.camminiditalia.ts`); a coda vuota non crea timer. Invia a
 * evento — ritorno della rete, login, scadenza dell'attesa dopo un errore — un elemento alla volta
 * e solo per l'utente loggato che l'ha scritto. Esiti: 2xx rimosso; 401 resta in attesa del login;
 * rete o 5xx nuovo tentativo con attese crescenti; 422, 413, 404 `failed`, da riaprire nel form.
 */
@Injectable({providedIn: 'root'})
export class DiaryOutboxService implements OnDestroy {
  private _items$ = new BehaviorSubject<DiaryOutboxItem[]>([]);
  private _userId: number | null = null;
  private _online = false;
  private _started = false;
  private _processing = false;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _sub = new Subscription();
  private _backoff: number[];

  constructor(
    private _store: Store,
    private _diarySvc: DiaryService,
    private _drafts: DiaryDraftStore,
    @Optional() @Inject(DIARY_OUTBOX_BACKOFF_MS) backoff?: number[],
  ) {
    this._backoff = backoff ?? DIARY_OUTBOX_BACKOFF_MINUTES.map(m => m * 60 * 1000);
  }

  /** `true` dopo `start()`: solo allora il form mette in coda invece di mostrare l'errore di rete. */
  get active(): boolean {
    return this._started;
  }

  /** Avvia la coda (idempotente): pulizia dei 90 giorni, ascolto di rete e login. */
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;
    await this._purge();
    await this._reload();
    this._sub.add(
      this._store
        .select(online)
        .pipe(distinctUntilChanged(), startWith(false), pairwise())
        .subscribe(([before, now]) => {
          this._online = now === true;
          if (!before && this._online) void this._process(true);
        }),
    );
    this._sub.add(
      this._store
        .select(selectDiariesSession)
        .pipe(
          map(s => s.userId),
          distinctUntilChanged(),
        )
        .subscribe(userId => {
          this._userId = userId;
          this._items$.next(this._items$.value);
          if (userId != null) void this._process(true);
        }),
    );
  }

  /** Ferma ascolti e timer. */
  ngOnDestroy(): void {
    this._sub.unsubscribe();
    if (this._timer) clearTimeout(this._timer);
  }

  /**
   * Mette in coda un diario nuovo scritto senza rete.
   * @param draft dati del diario
   * @param userId utente che l'ha scritto
   */
  async enqueue(draft: DiaryDraft, userId: number): Promise<void> {
    const item: DiaryOutboxItem = {
      uuid: draft.uuid,
      userId,
      layerId: draft.layerId,
      ecTrackId: draft.ecTrackId,
      description: draft.description ?? '',
      photos: draft.newPhotos ?? [],
      publicationConsent: draft.publicationConsent === true,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: 0,
      updatedAt: Date.now(),
    };
    await deviceDiaryOutbox.setItem(item.uuid, item);
    await this._reload();
    if (this._online) void this._process(true);
  }

  /**
   * Elementi in coda dell'utente corrente nel contesto: cammino (anche delle sue tappe) o tappa.
   * @param filter cammino o tappa
   * @returns elementi da mostrare nella sezione
   */
  items$(filter: {layerId?: number; ecTrackId?: number}): Observable<DiaryOutboxItem[]> {
    return this._items$.pipe(
      map(items =>
        items.filter(
          i =>
            i.userId === this._userId &&
            (filter.ecTrackId != null
              ? i.ecTrackId === filter.ecTrackId
              : filter.layerId == null || i.layerId === filter.layerId),
        ),
      ),
    );
  }

  /**
   * Quanti diari di un utente sono ancora in coda (per l'avviso al logout).
   * @param userId utente
   * @returns numero di elementi in coda
   */
  async pendingCount(userId: number): Promise<number> {
    const items = await this._readAll();
    return items.filter(i => i.userId === userId && i.status === 'pending').length;
  }

  /**
   * Diari in coda dell'utente loggato, per l'avviso al logout; 0 se la coda non è attiva.
   * @returns numero di elementi in coda
   */
  async pendingCountForCurrentUser(): Promise<number> {
    if (!this._started || this._userId == null) return 0;
    return this.pendingCount(this._userId);
  }

  /**
   * Toglie un elemento dalla coda (eliminato o riaperto nel form).
   * @param uuid uuid del diario
   */
  async discard(uuid: string): Promise<void> {
    await deviceDiaryOutbox.removeItem(uuid);
    await this._reload();
  }

  /**
   * Dati di invio di un elemento.
   * @param item elemento in coda
   * @returns il draft per `DiaryService.create`
   */
  toDraft(item: DiaryOutboxItem): DiaryDraft {
    return {
      uuid: item.uuid,
      layerId: item.layerId,
      ecTrackId: item.ecTrackId,
      description: item.description,
      newPhotos: item.photos ?? [],
      publicationConsent: item.publicationConsent,
    };
  }

  /** Un invio alla volta; `fromEvent` azzera l'attesa infinita dopo l'ultimo tentativo. */
  private async _process(fromEvent = false): Promise<void> {
    if (this._processing || !this._online || this._userId == null) return;
    this._processing = true;
    try {
      while (this._online && this._userId != null) {
        const now = Date.now();
        const next = (await this._readAll()).find(
          i =>
            i.userId === this._userId &&
            i.status === 'pending' &&
            (i.nextAttemptAt <= now || (fromEvent && i.nextAttemptAt === Infinity)),
        );
        if (!next) break;
        const keepGoing = await this._send(next);
        if (!keepGoing) break;
      }
    } finally {
      this._processing = false;
      await this._reload();
      this._schedule();
    }
  }

  /** @returns `true` se si può passare all'elemento successivo. */
  private async _send(item: DiaryOutboxItem): Promise<boolean> {
    try {
      await firstValueFrom(this._diarySvc.create(this.toDraft(item)));
      await deviceDiaryOutbox.removeItem(item.uuid);
      this._diarySvc.refresh();
      return true;
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      if (status === 401) return false;
      if (status === 0 || status === 429 || status >= 500) {
        const attempts = item.attempts + 1;
        const delay = this._backoff[attempts - 1];
        await deviceDiaryOutbox.setItem(item.uuid, {
          ...item,
          attempts,
          nextAttemptAt: delay != null ? Date.now() + delay : Infinity,
        });
        return false;
      }
      await deviceDiaryOutbox.setItem(item.uuid, {
        ...item,
        status: 'failed',
        errorMessage: status === 422 ? diaryHttpErrorKey(err) : DIARY_OUTBOX_FAILED_MESSAGE,
      });
      return true;
    }
  }

  /** Timer solo per il prossimo tentativo programmato: a coda vuota nessun timer. */
  private _schedule(): void {
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
    const waits = this._items$.value
      .filter(i => i.status === 'pending' && i.userId === this._userId && i.nextAttemptAt > 0 && i.nextAttemptAt !== Infinity)
      .map(i => i.nextAttemptAt);
    if (!waits.length) return;
    const delay = Math.max(0, Math.min(...waits) - Date.now());
    this._timer = setTimeout(() => void this._process(), delay);
  }

  private async _purge(): Promise<void> {
    const limit = Date.now() - DIARY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const old = (await this._readAll()).filter(i => (i.updatedAt ?? 0) < limit);
    await Promise.all(old.map(i => deviceDiaryOutbox.removeItem(i.uuid)));
    await this._drafts.purgeOlderThan(DIARY_RETENTION_DAYS).catch(() => 0);
  }

  private async _reload(): Promise<void> {
    this._items$.next(await this._readAll());
  }

  private async _readAll(): Promise<DiaryOutboxItem[]> {
    const all: DiaryOutboxItem[] = [];
    await deviceDiaryOutbox
      .iterate<DiaryOutboxItem, void>(v => void all.push(v))
      .catch(() => undefined);
    return all.sort((a, b) => a.updatedAt - b.updatedAt);
  }
}
