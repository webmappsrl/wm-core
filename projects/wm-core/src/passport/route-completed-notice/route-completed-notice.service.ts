import {Injectable, InjectionToken, OnDestroy, inject} from '@angular/core';
import {ToastController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {Subscription, combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {selectDiariesSession} from '@wm-core/diaries/diary.service';
import {confMAPLAYERS} from '@wm-core/store/conf/conf.selector';
import {wmTranslate} from '@wm-core/pipes/wmtrans.utils';
import {deviceCompletedRoutesSeen} from '@wm-core/utils/localForage';
import {ILAYER} from '@wm-core/types/config';
import {PassportRoute} from '@wm-types/passport';
import {PassportService} from '../passport.service';
import {PassportModalService} from '../passport-modal/passport-modal.service';

/** Archivio dei cammini completati già notificati, una chiave per utente (`u<id>`). */
export interface RouteCompletedSeenStore {
  getItem(key: string): Promise<number[] | null>;
  setItem(key: string, value: number[]): Promise<number[]>;
}

/** Archivio sul telefono dei cammini già notificati; nei test si sostituisce. */
export const ROUTE_COMPLETED_SEEN_STORE = new InjectionToken<RouteCompletedSeenStore>(
  'ROUTE_COMPLETED_SEEN_STORE',
  {providedIn: 'root', factory: () => deviceCompletedRoutesSeen as unknown as RouteCompletedSeenStore},
);

/** Classe della scheda, per lo stile in `_passport-theme.scss`. */
export const ROUTE_COMPLETED_TOAST_CLASS = 'wm-route-completed-toast';

/** Ruolo del pulsante «Vai al traguardo». */
const OPEN_ROLE = 'open';

/**
 * Avviso di cammino completato (oc:8169, ciclo 2), al posto dell'invito nell'email: quando un
 * cammino del Passaporto risulta completato e non è ancora stato notificato a quell'utente,
 * mostra una scheda in alto con «Più tardi» e «Vai al traguardo». Una scheda alla volta.
 *
 * Si accende solo da `tabs.page.camminiditalia.ts`. Il completamento si vede quando
 * `passportRoutes$()` si aggiorna (login, ritorno in primo piano, apertura del Passaporto), non
 * in tempo reale. Alla prima esecuzione per un utente i cammini già completati si segnano come
 * visti senza schede. Un cammino si segna visto quando la scheda compare: se l'app si chiude con
 * la scheda aperta, la notifica non si ripresenta.
 */
@Injectable({providedIn: 'root'})
export class RouteCompletedNoticeService implements OnDestroy {
  private _store = inject(Store);
  private _passportSvc = inject(PassportService);
  private _modalSvc = inject(PassportModalService);
  private _toastCtrl = inject(ToastController);
  private _langSvc = inject(LangService);
  private _seenStore = inject(ROUTE_COMPLETED_SEEN_STORE);

  private _sub: Subscription | null = null;
  private _userId: number | null = null;
  private _layers: ILAYER[] = [];
  /** Cammini da notificare, in ordine. */
  private _queue: number[] = [];
  private _showing: HTMLIonToastElement | null = null;
  /**
   * Cammino della scheda in preparazione o aperta. Si imposta prima del primo `await`: fra la
   * chiusura di una scheda e la comparsa della successiva `_showing` è vuoto, e un aggiornamento
   * dei cammini in quel momento aprirebbe una seconda scheda, anche dello stesso cammino.
   */
  private _current: number | null = null;
  /** Lettura e scrittura dei visti in fila, nell'ordine in cui sono chieste. */
  private _chain: Promise<void> = Promise.resolve();

  /** Avvia l'ascolto; chiamate successive non fanno nulla. */
  start(): void {
    if (this._sub) return;
    const userId$ = this._store.select(selectDiariesSession).pipe(
      map(session => session.userId),
      distinctUntilChanged(),
    );
    this._sub = combineLatest([
      userId$,
      this._passportSvc.passportRoutes$(),
      this._store.select(confMAPLAYERS),
    ]).subscribe(([userId, routes, layers]) => {
      if (userId !== this._userId) this._reset(userId);
      this._layers = layers ?? [];
      if (userId == null || routes == null) return;
      const completed = Array.from(routes.values())
        .filter((route: PassportRoute) => route.completed)
        .map(route => route.layerId);
      this._chain = this._chain.then(() => this._enqueueNew(userId, completed)).catch(() => undefined);
    });
  }

  /** Smette di ascoltare e chiude la scheda aperta. */
  ngOnDestroy(): void {
    this._sub?.unsubscribe();
    this._sub = null;
    this._reset(null);
  }

  /**
   * Cambio d'utente o logout: svuota la coda e chiude la scheda dell'utente precedente.
   * @param userId nuovo utente, `null` da non loggato
   */
  private _reset(userId: number | null): void {
    this._userId = userId;
    this._queue = [];
    this._current = null;
    const showing = this._showing;
    this._showing = null;
    void showing?.dismiss().catch(() => undefined);
  }

  /**
   * Mette in coda i cammini completati non ancora visti.
   * @param userId utente
   * @param completed cammini completati
   */
  private async _enqueueNew(userId: number, completed: number[]): Promise<void> {
    const key = this._key(userId);
    const seen = await this._seenStore.getItem(key);
    if (userId !== this._userId) return;
    if (seen == null) {
      // prima esecuzione per questo utente: niente schede per i cammini già fatti
      await this._seenStore.setItem(key, completed);
      return;
    }
    const fresh = completed.filter(id => !seen.includes(id) && !this._queue.includes(id) && id !== this._current);
    this._queue.push(...fresh);
    await this._showNext();
  }

  /** Mostra la prossima scheda, se nessuna è aperta. */
  private async _showNext(): Promise<void> {
    if (this._current != null || this._userId == null) return;
    const layerId = this._queue.shift();
    if (layerId == null) return;
    this._current = layerId;
    const userId = this._userId;
    const layer = this._layers.find(l => Number(l.id) === layerId);
    const name = layer ? wmTranslate(layer.title, this._langSvc) : '';
    let toast: HTMLIonToastElement;
    try {
      await this._markSeen(userId, layerId);
      toast = await this._createToast(name);
    } catch {
      // senza questo `_current` resterebbe occupato e nessun'altra scheda comparirebbe più
      if (this._current === layerId) this._current = null;
      return;
    }
    if (userId !== this._userId) return;
    this._showing = toast;
    void toast.onDidDismiss().then(({role}) => {
      if (this._showing !== toast) return;
      this._showing = null;
      this._current = null;
      if (role === OPEN_ROLE) {
        void this._modalSvc
          .open(
            {
              layerId,
              layerTitle: name,
              layerLogo: layer?.logo_image ?? undefined,
              layerImage: layer?.feature_image ?? undefined,
            },
            {refresh: true},
          )
          .catch(() => undefined);
      }
      void this._showNext();
    });
    await toast.present();
  }

  /**
   * Crea la scheda di un cammino completato.
   * @param name nome del cammino
   * @returns la scheda, non ancora mostrata
   */
  private _createToast(name: string): Promise<HTMLIonToastElement> {
    return this._toastCtrl.create({
      header: this._langSvc.instant('Hai completato {{name}}!', {name}),
      message: this._langSvc.instant('Guarda il traguardo e racconta il cammino nel diario'),
      position: 'top',
      duration: 0,
      swipeGesture: 'vertical',
      layout: 'stacked',
      cssClass: ROUTE_COMPLETED_TOAST_CLASS,
      buttons: [
        {text: this._langSvc.instant('Più tardi'), role: 'cancel'},
        {text: this._langSvc.instant('Vai al traguardo'), role: OPEN_ROLE},
      ],
    });
  }

  /**
   * Aggiunge un cammino ai visti dell'utente.
   * @param userId utente
   * @param layerId cammino
   */
  private async _markSeen(userId: number, layerId: number): Promise<void> {
    const key = this._key(userId);
    const seen = (await this._seenStore.getItem(key)) ?? [];
    if (!seen.includes(layerId)) await this._seenStore.setItem(key, [...seen, layerId]);
  }

  /**
   * @param userId utente
   * @returns la chiave dei visti
   */
  private _key(userId: number): string {
    return `u${userId}`;
  }
}
