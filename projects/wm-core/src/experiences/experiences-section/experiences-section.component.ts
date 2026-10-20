import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  ViewEncapsulation,
} from '@angular/core';
import {IonNav, ToastController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, combineLatest} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {passportLongDate} from '@wm-core/passport/passport.utils';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {online} from '@wm-core/store/network/network.selector';
import {Experience, ExperienceFilter, ExperiencesStatus} from '../experience.model';
import {ExperienceService} from '../experience.service';
import {ExperienceGuardHost, ExperienceLauncherService} from '../experience-launcher.service';
import {presentExperienceOfflineToast} from '../experience-offline.utils';

/** Dati del blocco pronti per il template. */
export interface ExperiencesSectionVm {
  /** `false` se il blocco non va reso affatto. */
  visible: boolean;
  status: ExperiencesStatus;
  list: Experience[];
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
  selector: 'wm-experiences-section',
  templateUrl: './experiences-section.component.html',
  styleUrls: ['./experiences-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmExperiencesSectionComponent implements OnChanges {
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
  @Input() guardHost?: ExperienceGuardHost;
  @Input() hideWhenEmpty = false;
  @Input() showCreate = true;

  readonly vm$: Observable<ExperiencesSectionVm>;

  private _filter$ = new BehaviorSubject<ExperienceFilter>({});
  /** Segnale di rete dell'app: senza rete i tocchi che la richiedono avvisano e basta. */
  private _offline = false;

  constructor(
    private _experienceSvc: ExperienceService,
    private _launcher: ExperienceLauncherService,
    private _langSvc: LangService,
    private _toastCtrl: ToastController,
    private _store: Store,
  ) {
    const list$ = this._filter$.pipe(switchMap(filter => this._experienceSvc.experiences$(filter)));
    this.vm$ = combineLatest([
      this._experienceSvc.status$(),
      list$,
      this._experienceSvc.savedCopy$(),
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
  ngOnChanges(): void {
    const onStage = this.ecTrackId != null;
    this._filter$.next({
      layerId: onStage ? undefined : this.layerId ?? undefined,
      ecTrackId: this.ecTrackId ?? undefined,
      ugcTrackId: this.ugcTrackId ?? undefined,
    });
  }

  /** Testo della scheda di creazione: della tappa nell'elenco, generico nel carosello. */
  get createLabel(): string {
    return this.layout === 'list' ? 'Racconta questa tappa' : 'Racconta la tua esperienza';
  }

  /**
   * Etichetta della scheda: «TAPPA 05» per una tappa, «CAMMINO» per il cammino; nelle
   * registrazioni, che mescolano cammini diversi, il nome del cammino.
   *
   * @param experience Esperienza.
   * @returns L'etichetta in maiuscolo.
   */
  label(experience: Experience): string {
    let text: string;
    if (experience.ecTrack) {
      const num = /tappa\s*(\d+)/i.exec(experience.ecTrack.name ?? '')?.[1];
      text = `${this._langSvc.instant('Tappa')}${num ? ` ${num}` : ''}`;
    } else if (this.ugcTrackId != null) {
      text = experience.layer?.name ?? '';
    } else {
      text = this._langSvc.instant('Cammino');
    }
    return text.toLocaleUpperCase();
  }

  /**
   * Riga sopra l'estratto nell'elenco: data e foto sulla tappa, l'etichetta altrove.
   *
   * @param experience Esperienza.
   * @returns Il testo della riga.
   */
  meta(experience: Experience): string {
    if (this.ecTrackId == null) return this.label(experience);
    const date = passportLongDate(experience.createdAt, this._langSvc.currentLang);
    const photos = experience.photos.length;
    return photos > 0 ? `${date} · ${photos} ${this._langSvc.instant('foto')}` : date;
  }

  /**
   * Prima foto dell'esperienza, per la scheda.
   *
   * @param experience Esperienza.
   * @returns L'URL della miniatura, `null` se non ha foto.
   */
  cover(experience: Experience): string | null {
    const photo = experience.photos[0];
    return photo ? photo.thumbnail || photo.url : null;
  }

  /**
   * Apre il form di creazione (da non loggato il launcher apre il login); offline avvisa che
   * serve la connessione.
   */
  create(): void {
    if (this._offline) {
      void presentExperienceOfflineToast(this._toastCtrl, this._langSvc);
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
   * Apre il dettaglio di un'esperienza.
   *
   * @param experience Esperienza toccata.
   */
  open(experience: Experience): void {
    void this._launcher.openDetail(experience, this.nav, this.guardHost);
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
    this._experienceSvc.refresh();
  }

  /**
   * Chiave di `trackBy` delle schede.
   *
   * @param _ Indice.
   * @param experience Esperienza.
   * @returns L'id, per `trackBy`.
   */
  trackById(_: number, experience: Experience): number {
    return experience.id;
  }

  /**
   * Testo della riga d'avviso senza dati freschi.
   *
   * @param status `offline` o `error`.
   * @param saved `true` se c'è una copia salvata.
   * @param logged `true` da loggato.
   * @returns La chiave i18n della riga.
   */
  private _notice(status: ExperiencesStatus, saved: boolean, logged: boolean): string {
    if (status === 'error') return 'Non è stato possibile aggiornare le esperienze.';
    if (saved) return "Sei offline: stai vedendo l'ultima versione salvata.";
    return logged
      ? 'Le tue esperienze non sono disponibili senza connessione.'
      : 'Le esperienze non sono disponibili senza connessione.';
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
  private _isVisible(status: ExperiencesStatus, list: Experience[], unavailable: boolean): boolean {
    if (status === 'off' || status === 'loading') return false;
    if (unavailable) return !this.hideWhenEmpty;
    if (list.length > 0) return true;
    return this.showCreate && !this.hideWhenEmpty;
  }
}
