import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {PassportCertification, PassportProgress} from '@wm-types/passport';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '../passport.service';
import {passportRingDegrees} from '../passport.utils';

/** Dati del dettaglio del cammino. */
export interface PassportDetailVm {
  progress: PassportProgress;
  /** Ultima richiesta di certificazione; `null` se la prima lettura è fallita (stato sconosciuto). */
  certification: PassportCertification | null;
  /** CTA visibile solo se il cammino non è completato e non c'è ancora nessuna richiesta. */
  showCta: boolean;
  /**
   * «Invia una nuova richiesta» dopo un esito (oc:8671): sempre dopo un rifiuto, dopo
   * un'approvazione solo se il cammino non è completato.
   */
  showRetry: boolean;
  /** Esito del gestore da mostrare, `null` se non c'è ancora una decisione. */
  outcome: 'approved' | 'rejected' | null;
  /**
   * Rimando all'email di esito: sempre per l'approvata, che vi elenca le tappe riconosciute; per la
   * non accettata solo senza nota, perché altrimenti il motivo è già nella nota.
   */
  showEmailHint: boolean;
}

/** Operazioni della modale host usate dal dettaglio. */
export interface PassportDetailHost {
  openForm(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Dettaglio del cammino nel passaporto (oc:8166, oc:8671; wireframe V1/V3/E1–E5): radice
 * dell'`ion-nav` della modale. Quando il template si sottoscrive, ogni volta che torna in primo
 * piano nell'`ion-nav` e a ogni `resume` dell'app, rilegge l'ultima richiesta di certificazione e
 * ne mostra lo stato o l'esito.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-detail',
  templateUrl: './passport-detail.component.html',
  styleUrls: ['./passport-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportDetailComponent implements OnInit, OnDestroy {
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
  /** Ultimo stato letto con successo, mostrato se una rilettura fallisce. */
  private _lastCertification: PassportCertification | null = null;
  /** Ascolto del ritorno dell'app in primo piano, attivo finché la modale è aperta. */
  private _resumeSub: Subscription | null = null;

  constructor(
    private _passportSvc: PassportService,
    private _langSvc: LangService,
  ) {
    this.vm$ = this._refresh$.pipe(
      switchMap(() =>
        combineLatest([
          this._passportSvc.getProgress(this.layerId),
          // l'errore resta dentro la singola rilettura: se chiudesse lo stream, il dettaglio non si
          // aggiornerebbe più fino alla riapertura della modale (oc:8671)
          this._passportSvc.getCertification(this.layerId).pipe(
            tap(certification => (this._lastCertification = certification)),
            catchError(() => of(this._lastCertification)),
          ),
        ]),
      ),
      map(([progress, certification]) => {
        const status = certification?.status;
        const notDone = progress.percent < 100;
        const outcome = status === 'approved' || status === 'rejected' ? status : null;
        return {
          progress,
          certification,
          showCta: notDone && status === 'none',
          showRetry: outcome === 'rejected' || (outcome === 'approved' && notDone),
          outcome,
          showEmailHint: outcome === 'approved' || (outcome === 'rejected' && !certification.decisionNote),
        };
      }),
    );
  }

  /** Rilegge lo stato a ogni ritorno dell'app in primo piano, per vedere l'esito appena arriva. */
  ngOnInit(): void {
    this._resumeSub = this._passportSvc.appResume$().subscribe(() => this.refresh());
  }

  /** Alla chiusura della modale smette di ascoltare il ritorno in primo piano. */
  ngOnDestroy(): void {
    this._resumeSub?.unsubscribe();
    this._resumeSub = null;
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
