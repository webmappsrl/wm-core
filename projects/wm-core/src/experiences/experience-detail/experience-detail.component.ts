import {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {AlertController, ToastController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, Observable, combineLatest, firstValueFrom, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {intlLocale, passportKm, passportLongDate} from '@wm-core/passport/passport.utils';
import {UgcTrackStatsService} from '@wm-core/services/ugc-track-stats.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {ugcTracksFeatures} from '@wm-core/store/features/ugc/ugc.selector';
import {online} from '@wm-core/store/network/network.selector';
import {openUgc} from '@wm-core/store/user-activity/user-activity.action';
import {UgcTrackStatsParams} from '@wm-core/types/config';
import {ugcTrackDetails} from '@wm-core/utils/ugc-track-stats';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {Experience} from '../experience.model';
import {ExperienceService} from '../experience.service';
import {presentExperienceOfflineToast} from '../experience-offline.utils';

/** Operazioni del contenitore usate dal dettaglio. */
export interface ExperienceDetailHost {
  back(): void;
  /** Apre il form di modifica nello stesso contenitore. */
  edit(experience: Experience): void;
  /**
   * Chiude l'intero contenitore: la modale, o la modale del Passaporto se il dettaglio sta nel
   * suo `ion-nav`. Serve prima di aprire una registrazione sulla mappa. Senza, il dettaglio usa
   * `back()`.
   *
   * @returns `true` se il contenitore si è chiuso davvero.
   */
  exit?(): Promise<boolean>;
}

/** Riga di una registrazione collegata. */
export interface ExperienceLinkedUgcRow {
  id: number;
  name: string;
  /**
   * «data · km · durata», senza le parti mancanti; vuota se la registrazione non è sul
   * telefono.
   */
  subline: string;
  /**
   * `false` se la registrazione non è sul telefono: aprirla per id mostrerebbe un'altra
   * traccia.
   */
  openable: boolean;
}

/** Dati del dettaglio pronti per il template. */
interface ExperienceDetailVm {
  experience: Experience;
  date: string;
  /** Registrazioni collegate, una riga per id. */
  ugcRows: ExperienceLinkedUgcRow[];
}

/**
 * Dettaglio di un'esperienza (oc:8169): galleria delle foto, cammino e tappa, data, racconto,
 * registrazioni collegate (toccandone una si apre sulla mappa come da «I miei percorsi»);
 * «Modifica» apre il form, «Elimina» chiede conferma e cancella. Segue lo stream del service,
 * così dopo una modifica mostra la versione salvata. Senza rete (segnale di rete dell'app, non lo
 * stato del service) «Modifica» ed «Elimina» restano visibili ma avvisano che serve la
 * connessione; con la rete presente provano e mostrano il loro errore.
 */
@Component({
  standalone: false,
  selector: 'wm-experience-detail',
  templateUrl: './experience-detail.component.html',
  styleUrls: ['./experience-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmExperienceDetailComponent implements OnInit, OnDestroy {
  @Input() host?: ExperienceDetailHost;
  @Input() set experience(experience: Experience | undefined) {
    if (experience) this._experience$.next(experience);
  }

  /** Foto mostrata nella galleria, per i pallini. */
  activePhoto = 0;
  deleting = false;
  /** Messaggio d'errore dell'ultima cancellazione, `null` se non ce n'è. */
  errorMessage: string | null = null;
  vm$: Observable<ExperienceDetailVm | null>;

  private _experience$ = new BehaviorSubject<Experience | null>(null);
  /** `true` dopo l'uscita (chiusura o back): una DELETE che finisce dopo non deve rifare il pop. */
  private _left = false;
  /** Vero mentre si apre una registrazione: protegge dal doppio tap. */
  private _openingUgc = false;
  /** Segnale di rete dell'app: senza rete modifica e cancellazione avvisano e basta. */
  private _offline = false;

  constructor(
    private _experienceSvc: ExperienceService,
    private _store: Store,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
    private _urlHandlerSvc: UrlHandlerService,
    private _ugcTrackStatsSvc: UgcTrackStatsService,
    private _toastCtrl: ToastController,
  ) {}

  /**
   * Collega lo stream: l'esperienza aggiornata dal service, se c'è, altrimenti quella ricevuta.
   */
  ngOnInit(): void {
    const current$ = this._experience$.pipe(
      switchMap(input =>
        input == null
          ? of(null)
          : this._experienceSvc.experiences$().pipe(
              map(list => list.find(e => e.id === input.id) ?? input),
              catchError(() => of(input)),
            ),
      ),
    );
    this.vm$ = combineLatest([
      current$,
      this._store.select(ugcTracksFeatures),
      this._ugcTrackStatsSvc.params$,
      this._store.select(online),
    ]).pipe(
      map(([experience, ugcTracks, params, isOnline]) => {
        this._offline = isOnline === false;
        return experience == null ? null : this._toVm(experience, ugcTracks ?? [], params);
      }),
    );
  }

  /** Segna l'uscita: il back è già avvenuto (per esempio durante la DELETE). */
  ngOnDestroy(): void {
    this._left = true;
  }

  /** Chiude il dettaglio. */
  close(): void {
    this._left = true;
    this.host?.back();
  }

  /**
   * Apre il form di modifica; offline avvisa che serve la connessione.
   *
   * @param experience Esperienza mostrata.
   */
  edit(experience: Experience): void {
    if (this._offline) {
      void presentExperienceOfflineToast(this._toastCtrl, this._langSvc);
      return;
    }
    this.host?.edit(experience);
  }

  /**
   * Foto non caricata (tipicamente offline): si nasconde l'immagine rotta e resta il fondo neutro
   * della galleria, senza togliere la foto dallo scorrimento.
   *
   * @param event Evento `error` dell'immagine.
   */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) img.style.visibility = 'hidden';
  }

  /**
   * Apre una registrazione collegata sulla mappa come il tap in «I miei percorsi»
   * (`UrlHandlerService.setTrack()` con «I miei percorsi» aperto, cioè `ugc_track` verso `map`),
   * dopo aver chiuso il contenitore del dettaglio. Se il contenitore non si chiude (un guard
   * rifiuta) non naviga.
   *
   * @param row Riga toccata.
   */
  async openUgcTrack(row: ExperienceLinkedUgcRow): Promise<void> {
    if (!row.openable || this._openingUgc || this.deleting) return;
    this._openingUgc = true;
    try {
      if (!(await this._exitHost())) return;
      this._left = true;
      // `setTrack()` sceglie `ugc_track` solo con «I miei percorsi» già aperto: qui si apre in
      // ogni caso, e `updateURL()` con `ugc_track` rifà anche lui `openUgc()`
      this._store.dispatch(openUgc());
      const params = this._urlHandlerSvc.getCurrentQueryParams() ?? {};
      const sameUgc = params.ugc_track != null && `${params.ugc_track}` === `${row.id}`;
      if (sameUgc && this._urlHandlerSvc.getCurrentPath() !== 'map') {
        // stesso `ugc_track` già nell'URL (aperto prima sulla mappa, poi tornati alla Home):
        // `updateURL()` non navigherebbe perché i parametri non cambiano
        this._urlHandlerSvc.navigateTo(['map'], {
          ...params,
          ugc_track: row.id,
          track: undefined,
          poi: undefined,
          ugc_poi: undefined,
        });
      } else {
        this._urlHandlerSvc.updateURL({ugc_track: row.id}, ['map']);
      }
    } finally {
      this._openingUgc = false;
    }
  }

  /**
   * Chiede conferma e cancella l'esperienza; poi chiude il dettaglio. Offline avvisa che serve la
   * connessione, senza chiedere conferma.
   *
   * @param experience Esperienza mostrata.
   */
  async remove(experience: Experience): Promise<void> {
    if (this.deleting) return;
    if (this._offline) {
      await presentExperienceOfflineToast(this._toastCtrl, this._langSvc);
      return;
    }
    const alert = await this._alertCtrl.create({
      header: this._langSvc.instant('Eliminare questa esperienza?'),
      buttons: [
        {text: this._langSvc.instant('Annulla'), role: 'cancel'},
        {text: this._langSvc.instant('Elimina'), role: 'destructive'},
      ],
    });
    await alert.present();
    const {role} = await alert.onDidDismiss();
    if (role !== 'destructive') return;
    this.deleting = true;
    this.errorMessage = null;
    this._cdr.markForCheck();
    try {
      await firstValueFrom(this._experienceSvc.remove(experience.id));
      // se nel frattempo si è già usciti, un secondo back chiuderebbe la pagina sotto (doppio pop)
      if (!this._left) this.host?.back();
    } catch (err) {
      this.errorMessage = this._langSvc.instant(
        this._isOffline(err)
          ? 'Nessuna connessione: riprova quando sei online.'
          : 'Eliminazione non riuscita, riprova',
      );
    } finally {
      this.deleting = false;
      this._cdr.markForCheck();
    }
  }

  /**
   * Aggiorna il pallino attivo allo scorrimento della galleria.
   *
   * @param el Contenitore a scorrimento orizzontale.
   */
  onGalleryScroll(el: HTMLElement): void {
    const width = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / width);
    if (index !== this.activePhoto) {
      this.activePhoto = index;
      this._cdr.markForCheck();
    }
  }

  /**
   * Chiude il contenitore prima di aprire una registrazione: `exit()` se l'host lo offre,
   * altrimenti `back()`.
   *
   * @returns `true` se si può navigare.
   */
  private async _exitHost(): Promise<boolean> {
    if (this.host?.exit) return this.host.exit();
    this.host?.back();
    return true;
  }

  /**
   * Indica se l'errore è mancanza di connessione, come nel form.
   *
   * @param err Errore della cancellazione.
   * @returns `true` per uno status 0 o con il dispositivo offline.
   */
  private _isOffline(err: unknown): boolean {
    if (err instanceof HttpErrorResponse && err.status === 0) return true;
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  /**
   * Prepara i dati del template.
   *
   * @param experience Esperienza.
   * @param ugcTracks Registrazioni dell'utente nello store, per nome, data e dati tecnici.
   * @param params Parametri della pulizia GPS, per i dati tecnici calcolati in locale.
   * @returns I dati del dettaglio.
   */
  private _toVm(
    experience: Experience,
    ugcTracks: WmFeature<LineString>[],
    params: UgcTrackStatsParams,
  ): ExperienceDetailVm {
    const lang = this._langSvc.currentLang;
    const ugcRows = (experience.ugcTrackIds ?? []).map(id =>
      this._toUgcRow(
        id,
        ugcTracks.find(f => f?.properties?.id != null && `${f.properties.id}` === `${id}`),
        params,
        lang,
      ),
    );
    return {experience, date: passportLongDate(experience.createdAt, lang), ugcRows};
  }

  /**
   * Riga di una registrazione collegata: nome, «data · km · durata» con i dati tecnici letti
   * come nel dettaglio della traccia (`ugcTrackDetails`). Se la registrazione non è sul telefono
   * resta «Registrazione», senza sottotitolo e non toccabile.
   *
   * @param id Id della registrazione.
   * @param track Registrazione nello store, se c'è.
   * @param params Parametri della pulizia GPS.
   * @param lang Lingua corrente.
   * @returns La riga.
   */
  private _toUgcRow(
    id: number,
    track: WmFeature<LineString> | undefined,
    params: UgcTrackStatsParams,
    lang: string,
  ): ExperienceLinkedUgcRow {
    const fallback = this._langSvc.instant('Registrazione');
    if (!track) return {id, name: fallback, subline: '', openable: false};
    const details = ugcTrackDetails(track, params);
    const parts = [
      this._fullDate(track.properties?.createdAt, lang),
      details.distance != null ? `${passportKm(details.distance, lang)} km` : '',
      details.duration != null ? formatUgcDuration(details.duration) : '',
    ].filter(part => part !== '');
    return {
      id,
      name: track.properties?.name || fallback,
      subline: parts.join(' · '),
      openable: true,
    };
  }

  /**
   * Data completa («12 giugno 2026») di una registrazione.
   *
   * @param value `createdAt` della registrazione, stringa o data.
   * @param lang Lingua corrente.
   * @returns La data, vuota se manca o non è valida.
   */
  private _fullDate(value: unknown, lang: string): string {
    if (value == null || value === '') return '';
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(intlLocale(lang), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}

/**
 * Durata di una registrazione come nelle schede: «5 h 12'», sotto l'ora solo «45'».
 *
 * @param minutes Durata in minuti, come `duration` dei dati tecnici.
 * @returns La durata formattata.
 */
export function formatUgcDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours} h ${String(rest).padStart(2, '0')}'` : `${rest}'`;
}
