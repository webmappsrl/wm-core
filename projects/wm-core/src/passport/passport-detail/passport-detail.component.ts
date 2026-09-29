import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {PassportCertification, PassportProgress} from '@wm-types/passport';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '../passport.service';
import {passportRingDegrees} from '../passport.utils';

/** Dati del dettaglio del cammino. */
export interface PassportDetailVm {
  progress: PassportProgress;
  certification: PassportCertification;
  /** CTA visibile solo se il cammino non è completato e non c'è una richiesta in attesa. */
  showCta: boolean;
}

/** Operazioni della modale host usate dal dettaglio. */
export interface PassportDetailHost {
  openForm(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Dettaglio del cammino nel passaporto (oc:8166, wireframe V1/V3): radice dell'`ion-nav`
 * della modale. Quando il template si sottoscrive, e ogni volta che torna in primo piano,
 * verifica se esiste una richiesta di certificazione inviata.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-detail',
  templateUrl: './passport-detail.component.html',
  styleUrls: ['./passport-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportDetailComponent {
  @Input() layerId: number;
  @Input() layerTitle: string;
  /** Logo al centro dell'anello e immagine sbiadita di sfondo, come nel wireframe. */
  @Input() layerLogo: string;
  @Input() layerImage: string;
  /** Modale host, per aprire il form e chiudere. */
  @Input() host: PassportDetailHost;

  /**
   * Observable stabile: ogni `refresh()` produce una nuova emissione sullo stesso stream, così
   * l'`async` pipe segna la view da aggiornare anche con `OnPush`. Riassegnare `vm$` non basta:
   * gli hook di Ionic arrivano da un listener DOM che non marca la view come dirty (oc:8166).
   */
  readonly vm$: Observable<PassportDetailVm>;

  private readonly _refresh$ = new BehaviorSubject<void>(undefined);
  /** La prima entrata non ricarica: i dati arrivano già con la sottoscrizione del template. */
  private _entered = false;

  constructor(
    private _passportSvc: PassportService,
    private _langSvc: LangService,
  ) {
    this.vm$ = this._refresh$.pipe(
      switchMap(() =>
        combineLatest([
          this._passportSvc.getProgress(this.layerId),
          this._passportSvc.getCertification(this.layerId),
        ]),
      ),
      map(([progress, certification]) => ({
        progress,
        certification,
        showCta: progress.percent < 100 && certification.status === 'none',
      })),
    );
  }

  /** Ionic chiama questo hook quando il dettaglio torna in primo piano nell'`ion-nav`. */
  ionViewWillEnter(): void {
    if (this._entered) this.refresh();
    this._entered = true;
  }

  /**
   * Gradi dell'arco verde dell'anello di avanzamento.
   *
   * @param percent Percentuale 0-100.
   * @returns Gradi 0-360.
   */
  ringDegrees(percent: number): number {
    return passportRingDegrees(percent);
  }

  /**
   * Data breve nella lingua corrente («12 mag»), come nel wireframe.
   *
   * @param iso Data ISO 8601.
   * @returns La data formattata, vuota se assente.
   */
  shortDate(iso: string | undefined): string {
    if (!iso) return '';
    // nel repo il portoghese ha codice «pr», che Intl non riconosce
    const lang = this._langSvc?.currentLang === 'pr' ? 'pt' : this._langSvc?.currentLang || 'it';
    return new Intl.DateTimeFormat(lang, {day: 'numeric', month: 'short'}).format(new Date(iso));
  }

  /** Rilegge progresso e stato della richiesta, per esempio dopo un invio. */
  refresh(): void {
    this._refresh$.next();
  }
}
