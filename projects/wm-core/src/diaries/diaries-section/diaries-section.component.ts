import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import {IonNav, ToastController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, combineLatest, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import type {SwiperOptions} from 'swiper/types';
import {LangService} from '@wm-core/localization/lang.service';
import {passportLongDate} from '@wm-core/passport/passport.utils';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {online} from '@wm-core/store/network/network.selector';
import {Diary, DiaryFilter, DiariesStatus} from '../diary.model';
import {DiaryService} from '../diary.service';
import {DiaryGuardHost, DiaryLauncherService} from '../diary-launcher.service';
import {DiaryOutboxItem, DiaryOutboxService} from '../diary-outbox.service';
import {DiaryDraftStore, diaryDraftKey} from '../diary-draft.store';
import {presentDiaryOfflineToast} from '../diary-offline.utils';
import {diaryTextExcerpt} from '../diary-text.utils';

/** Riaprendo un diario non inviato dove c'è già un'altra bozza (oc:8169, ciclo 2). */
export const DIARY_DRAFT_CONFLICT_MESSAGE =
  'Hai già una pagina di diario in corso qui: pubblicala o eliminala prima.';

/** Dati del blocco pronti per il template. */
export interface DiariesSectionVm {
  /** `false` se il blocco non va reso affatto. */
  visible: boolean;
  status: DiariesStatus;
  list: Diary[];
  /** Riga d'avviso sotto il titolo (chiave i18n), con «Riprova»; `null` con dati freschi. */
  notice: string | null;
  /** `true` senza dati freschi e senza copia salvata: al posto della lista solo la riga. */
  unavailable: boolean;
}

/**
 * Blocco «esperienze» (oc:8169), montato su cammino, tappa, Passaporto e registrazioni: elenco
 * delle esperienze dell'utente filtrate per il contesto, e la scheda «Racconta…» che apre il form.
 * Non rende nulla se la funzione è spenta (o in caricamento); da non loggato mostra solo la
 * scheda, il cui tocco apre il login. Senza dati freschi (`offline` o `error`) mostra la copia
 * salvata con una riga d'avviso e «Riprova»; senza copia, solo la riga. «Racconta…» si blocca sul
 * segnale di rete reale, non sullo stato: con la rete presente il form prova e mostra il suo
 * errore.
 */
@Component({
  standalone: false,
  selector: 'wm-diaries-section',
  templateUrl: './diaries-section.component.html',
  styleUrls: ['./diaries-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDiariesSectionComponent implements OnChanges {
  @Input() layerId?: number;
  @Input() ecTrackId?: number;
  @Input() ugcTrackId?: number;
  @Input() layout: 'carousel' | 'list' = 'carousel';
  @Input() title = '';
  /** Cammino e tappa mostrati in cima al form di creazione. */
  @Input() contextLabel = '';
  /** `ion-nav` del Passaporto: form e dettaglio vengono spinti lì. */
  @Input() nav?: IonNav;
  /** Contenitore di `nav` su cui il form registra il guard d'uscita (la modale del Passaporto). */
  @Input() guardHost?: DiaryGuardHost;
  @Input() hideWhenEmpty = false;
  @Input() showCreate = true;
  /**
   * Margine laterale del carosello, in px: la riga va oltre il padding del contenitore di questa
   * misura e le schede ne restano staccate (16 nel Passaporto, dove la riga va a filo del bordo).
   */
  @Input() carouselInset = 4;

  /** Opzioni di `wm-swiper` per il carosello; ricreate solo se cambia `carouselInset`. */
  carouselOptions: SwiperOptions = this._carouselOptions();

  readonly vm$: Observable<DiariesSectionVm>;
  /** Diari nuovi scritti senza rete, in attesa di invio o rifiutati (oc:8169, ciclo 2). */
  readonly queued$: Observable<DiaryOutboxItem[]>;

  private _filter$ = new BehaviorSubject<DiaryFilter>({});
  /** Segnale di rete dell'app: senza rete i tocchi che la richiedono avvisano e basta. */
  private _offline = false;

  constructor(
    private _diarySvc: DiaryService,
    private _launcher: DiaryLauncherService,
    private _langSvc: LangService,
    private _toastCtrl: ToastController,
    private _store: Store,
    private _outbox: DiaryOutboxService,
    private _drafts: DiaryDraftStore,
  ) {
    this.queued$ = this._filter$.pipe(
      // nella registrazione (`ugcTrackId`) i diari in coda non c'entrano
      switchMap(f => (f.ugcTrackId != null ? of([]) : this._outbox.items$({layerId: f.layerId, ecTrackId: f.ecTrackId}))),
    );
    const list$ = this._filter$.pipe(switchMap(filter => this._diarySvc.diaries$(filter)));
    this.vm$ = combineLatest([
      this._diarySvc.status$(),
      list$,
      this._diarySvc.savedCopy$(),
      this._store.select(isLogged),
      this._store.select(online),
      this._filter$,
    ]).pipe(
      map(([status, list, saved, logged, isOnline]) => {
        this._offline = isOnline === false;
        const stale = status === 'offline' || status === 'error';
        const unavailable = stale && !saved;
        return {
          status,
          list,
          notice: stale ? this._notice(status, saved, !!logged) : null,
          unavailable,
          visible: this._isVisible(status, list, unavailable),
        };
      }),
    );
  }

  /**
   * Aggiorna il filtro allo stream stabile del template. Sulla tappa filtra solo per tappa: il
   * cammino di un'esperienza lo decide il backend (ricerca, deep link, tappa condivisa fra più
   * cammini) e può non coincidere con `layerId`, che resta solo per la creazione.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['carouselInset']) this.carouselOptions = this._carouselOptions();
    const onStage = this.ecTrackId != null;
    this._filter$.next({
      layerId: onStage ? undefined : this.layerId ?? undefined,
      ecTrackId: this.ecTrackId ?? undefined,
      ugcTrackId: this.ugcTrackId ?? undefined,
    });
  }

  /** Testo della scheda di creazione: della tappa nell'elenco, generico nel carosello. */
  get createLabel(): string {
    return this.layout === 'list' ? 'Racconta questa tappa' : 'Racconta il tuo cammino';
  }

  /**
   * Estratto della scheda, senza formattazione.
   * @param text racconto
   * @returns il testo su una riga
   */
  excerpt(text: string | null | undefined): string {
    return diaryTextExcerpt(text);
  }

  /**
   * Etichetta della scheda: «TAPPA 05» per una tappa, «CAMMINO» per il cammino; nelle
   * registrazioni, che mescolano cammini diversi, il nome del cammino.
   *
   * @param diary Esperienza.
   * @returns L'etichetta in maiuscolo.
   */
  label(diary: Diary): string {
    let text: string;
    if (diary.ecTrack) {
      const num = /tappa\s*(\d+)/i.exec(diary.ecTrack.name ?? '')?.[1];
      text = `${this._langSvc.instant('Tappa')}${num ? ` ${num}` : ''}`;
    } else if (this.ugcTrackId != null) {
      text = diary.layer?.name ?? '';
    } else {
      text = this._langSvc.instant('Cammino');
    }
    return text.toLocaleUpperCase();
  }

  /**
   * Riga sopra l'estratto nell'elenco: data e foto sulla tappa, l'etichetta altrove.
   *
   * @param diary Esperienza.
   * @returns Il testo della riga.
   */
  meta(diary: Diary): string {
    if (this.ecTrackId == null) return this.label(diary);
    const date = passportLongDate(diary.createdAt, this._langSvc.currentLang);
    const photos = diary.photos.length;
    return photos > 0 ? `${date} · ${photos} ${this._langSvc.instant('foto')}` : date;
  }

  /**
   * Prima foto dell'esperienza, per la scheda.
   *
   * @param diary Esperienza.
   * @returns L'URL della miniatura, `null` se non ha foto.
   */
  cover(diary: Diary): string | null {
    const photo = diary.photos[0];
    return photo ? photo.thumbnail || photo.url : null;
  }

  /**
   * Apre il form di creazione (da non loggato il launcher apre il login); offline avvisa che
   * serve la connessione.
   */
  create(): void {
    // con la coda attiva si scrive anche senza rete: il form mette il diario in coda
    if (this._offline && !this._outbox.active) {
      void presentDiaryOfflineToast(this._toastCtrl, this._langSvc);
      return;
    }
    void this._launcher.openForm({
      layerId: this.layerId ?? undefined,
      ecTrackId: this.ecTrackId ?? undefined,
      contextLabel: this.contextLabel,
      nav: this.nav,
      guardHost: this.guardHost,
    });
  }

  /**
   * Un diario in coda rifiutato dal server si riapre nel form come bozza, con il messaggio, per
   * correggerlo e ripubblicarlo; quello in attesa non fa nulla (parte da solo).
   *
   * @param item Elemento in coda toccato.
   */
  async openQueued(item: DiaryOutboxItem): Promise<void> {
    if (item.status !== 'failed') return;
    const key = diaryDraftKey(item.userId, {layerId: item.layerId, ecTrackId: item.ecTrackId});
    // una bozza diversa già aperta nello stesso contesto non si sovrascrive
    const existing = await this._drafts.load(key).catch(() => null);
    if (existing && existing.uuid !== item.uuid) {
      const toast = await this._toastCtrl.create({
        message: this._langSvc.instant(DIARY_DRAFT_CONFLICT_MESSAGE),
        duration: 3000,
      });
      await toast.present();
      return;
    }
    await this._drafts.save({
      key,
      userId: item.userId,
      uuid: item.uuid,
      layerId: item.layerId,
      ecTrackId: item.ecTrackId,
      description: item.description,
      photos: item.photos ?? [],
      publicationConsent: item.publicationConsent,
      ratings: item.ratings,
      walkDates: item.walkDates,
      errorMessage: item.errorMessage,
      updatedAt: Date.now(),
    });
    await this._outbox.discard(item.uuid);
    await this._launcher.openForm({
      layerId: item.layerId,
      ecTrackId: item.ecTrackId,
      contextLabel: this.contextLabel,
      nav: this.nav,
      guardHost: this.guardHost,
    });
  }

  /**
   * @param _ indice
   * @param item elemento in coda
   * @returns chiave stabile
   */
  trackByUuid(_: number, item: DiaryOutboxItem): string {
    return item.uuid;
  }

  /**
   * Apre il dettaglio di un'esperienza.
   *
   * @param diary Esperienza toccata.
   */
  open(diary: Diary): void {
    void this._launcher.openDetail(diary, this.nav, this.guardHost);
  }

  /**
   * Foto non caricata (tipicamente offline): si nasconde l'immagine rotta e resta il riquadro
   * neutro del contenitore.
   *
   * @param event Evento `error` dell'immagine.
   */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) img.style.visibility = 'hidden';
  }

  /** Rilegge le esperienze dal backend («Riprova» della riga d'avviso). */
  retry(): void {
    this._diarySvc.refresh();
  }

  /**
   * Chiave di `trackBy` delle schede.
   *
   * @param _ Indice.
   * @param diary Esperienza.
   * @returns L'id, per `trackBy`.
   */
  trackById(_: number, diary: Diary): number {
    return diary.id;
  }

  /**
   * Schede a larghezza fissa (`slidesPerView: 'auto'`) staccate dai bordi di `carouselInset`;
   * `observer` riprende le schede aggiunte o tolte dopo l'avvio (esperienza creata o cancellata).
   *
   * @returns Le opzioni di `wm-swiper`.
   */
  private _carouselOptions(): SwiperOptions {
    return {
      slidesPerView: 'auto',
      spaceBetween: 10,
      slidesOffsetBefore: this.carouselInset,
      slidesOffsetAfter: this.carouselInset,
      observer: true,
    };
  }

  /**
   * Testo della riga d'avviso senza dati freschi.
   *
   * @param status `offline` o `error`.
   * @param saved `true` se c'è una copia salvata.
   * @param logged `true` da loggato.
   * @returns La chiave i18n della riga.
   */
  private _notice(status: DiariesStatus, saved: boolean, logged: boolean): string {
    if (status === 'error') return 'Non è stato possibile aggiornare il diario.';
    if (saved) return "Sei offline: stai vedendo l'ultima versione salvata.";
    return logged
      ? 'Il tuo diario non è disponibile senza connessione.'
      : 'Il diario non è disponibile senza connessione.';
  }

  /**
   * Il blocco si rende solo con la funzione attiva, senza dati freschi o da non loggato; vuoto,
   * solo se c'è la scheda di creazione e non è chiesto di nasconderlo. Senza dati freschi e senza
   * copia salvata mostra la riga con «Riprova», tranne dove il blocco vuoto va nascosto.
   *
   * @param status Stato della funzione.
   * @param list Esperienze del contesto.
   * @param unavailable `true` senza dati freschi e senza copia salvata.
   * @returns `true` se il blocco va reso.
   */
  private _isVisible(status: DiariesStatus, list: Diary[], unavailable: boolean): boolean {
    if (status === 'off' || status === 'loading') return false;
    if (unavailable) return !this.hideWhenEmpty;
    if (list.length > 0) return true;
    return this.showCreate && !this.hideWhenEmpty;
  }
}
