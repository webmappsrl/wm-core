import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {BehaviorSubject, combineLatest, defer, Observable, of, Subscription} from 'rxjs';
import {catchError, map, startWith, switchMap, tap} from 'rxjs/operators';
import {PassportCertification, PassportProgress, PassportStage} from '@wm-types/passport';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '../passport.service';
import {
  gpsOutings,
  latestCompletedAt,
  passportKm,
  passportLongDate,
  passportRingDegrees,
  passportShortDate,
  sortStages,
  stageName,
  totalDistanceKm,
} from '../passport.utils';

/** Dati del dettaglio del cammino. */
export interface PassportDetailVm {
  /** Progresso del cammino; `null` se la prima lettura è fallita (oc:8676). */
  progress: PassportProgress | null;
  /** Tappe ordinate per nome nella lingua corrente, vuote senza progresso (oc:8676). */
  stages: PassportStage[];
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
   * Rimando all'email di esito, solo per la non accettata senza nota: altrimenti il motivo è già
   * nella nota. Dopo un'approvazione no, perché le tappe riconosciute sono a schermo (oc:8676).
   */
  showEmailHint: boolean;
  /** Cammino completato secondo il backend: il dettaglio mostra il traguardo (oc:8703). */
  completed: boolean;
  /** Data di completamento più recente fra le tappe, `null` se non completato o senza date. */
  completedAt: string | null;
  /** Km del cammino, `null` se non completato o se una tappa non ha la distanza. */
  totalKm: number | null;
  /** Uscite, solo con tutte le tappe validate col GPS; altrimenti `null`. */
  outings: number | null;
}

/** Operazioni della modale host usate dal dettaglio. */
export interface PassportDetailHost {
  openForm(): Promise<void>;
  openStage(stage: PassportStage): Promise<void>;
  close(): Promise<void>;
  /** Anteprima della condivisione del cammino completato (oc:8703). */
  openRouteSharePreview(): Promise<void>;
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

  /**
   * Lista delle tappe aperta, nello stato completato (oc:8703). Uno stream e non un campo: con
   * `OnPush` il template si aggiorna da sé al tocco.
   */
  readonly stagesOpen$ = new BehaviorSubject<boolean>(false);

  private readonly _refresh$ = new BehaviorSubject<void>(undefined);
  /** La prima entrata non ricarica: i dati arrivano già con la sottoscrizione del template. */
  private _entered = false;
  /** Vero mentre è aperta la pagina di una tappa: tornando da lì non c'è nulla da rileggere. */
  private _skipNextEnter = false;
  /** Ultimo stato letto con successo, mostrato se una rilettura fallisce. */
  private _lastCertification: PassportCertification | null = null;
  /** Ascolto del ritorno dell'app in primo piano, attivo finché la modale è aperta. */
  private _resumeSub: Subscription | null = null;

  constructor(
    private _passportSvc: PassportService,
    private _langSvc: LangService,
  ) {
    this.vm$ = combineLatest([
      // stream condiviso con badge e anello, fuori dal refresh: una rilettura non lo risottoscrive.
      // Gli errori li gestisce il service. `defer`: `layerId` arriva dopo il costruttore (oc:8676)
      defer(() => this._passportSvc.progress$(this.layerId)),
      this._refresh$.pipe(
        switchMap(() =>
          // l'errore resta dentro la singola rilettura: se chiudesse lo stream, il dettaglio non si
          // aggiornerebbe più fino alla riapertura della modale (oc:8671)
          this._passportSvc.getCertification(this.layerId).pipe(
            tap(certification => (this._lastCertification = certification)),
            catchError(() => of(this._lastCertification)),
          ),
        ),
      ),
      defer(() => this._langSvc.onLangChange.pipe(startWith(null))),
    ]).pipe(
      map(([progress, certification]) => {
        const status = certification?.status;
        // senza progresso non si propone nessuna azione: non si sa a che punto è il cammino
        const notDone = progress != null && !progress.completed;
        const completed = progress?.completed === true;
        const stages = progress?.stages ?? [];
        // a cammino completato il traguardo dice già com'è andata: niente esito della richiesta,
        // la nota del gestore resta nella mail (oc:8703)
        const outcome = !completed && (status === 'approved' || status === 'rejected') ? status : null;
        return {
          progress,
          stages: sortStages(stages, this._langSvc.currentLang),
          certification,
          showCta: notDone && status === 'none',
          showRetry: outcome === 'rejected' || (outcome === 'approved' && notDone),
          outcome,
          showEmailHint: outcome === 'rejected' && !certification.decisionNote,
          completed,
          completedAt: completed ? latestCompletedAt(stages) : null,
          totalKm: completed ? totalDistanceKm(stages) : null,
          outings: completed ? gpsOutings(stages) : null,
        };
      }),
    );
  }

  /** Rilegge lo stato a ogni ritorno dell'app in primo piano, per vedere l'esito appena arriva. */
  ngOnInit(): void {
    // il progresso si rilegge già da sé al resume: qui basta la certificazione (oc:8676)
    this._resumeSub = this._passportSvc.appResume$().subscribe(() => this._refresh$.next());
  }

  /** Alla chiusura della modale smette di ascoltare il ritorno in primo piano. */
  ngOnDestroy(): void {
    this._resumeSub?.unsubscribe();
    this._resumeSub = null;
  }

  /** Ionic chiama questo hook quando il dettaglio torna in primo piano nell'`ion-nav`. */
  ionViewWillEnter(): void {
    if (this._skipNextEnter) {
      this._skipNextEnter = false;
      return;
    }
    if (this._entered) this.refresh();
    this._entered = true;
  }

  /**
   * Apre la pagina della tappa (oc:8676). Il ritorno da lì non rilegge: la pagina non cambia dati.
   *
   * @param stage Tappa toccata.
   */
  async openStage(stage: PassportStage): Promise<void> {
    this._skipNextEnter = true;
    await this.host?.openStage(stage);
  }

  /**
   * Etichetta accessibile della riga: il ✓ è decorativo, quindi lo stato va detto a parole.
   *
   * @param stage Tappa della lista.
   * @returns Nome e stato della tappa.
   */
  rowAriaLabel(stage: PassportStage): string {
    const lang = this._langSvc?.currentLang;
    let status: string;
    if (stage.status === 'completed') {
      status = this._langSvc.instant('percorsa il {{date}}', {date: passportShortDate(stage.completedAt, lang)});
    } else if (stage.status === 'in_progress') {
      status = `${stage.percent}%`;
    } else {
      status = this._langSvc.instant('non ancora percorsa');
    }
    return `${stageName(stage, lang)}, ${status}`;
  }

  /**
   * Identità delle righe per `*ngFor`: a ogni rilettura le righe restano, e il focus con loro.
   *
   * @param _index Posizione della riga.
   * @param stage Tappa della riga.
   * @returns L'id della tappa.
   */
  trackStage(_index: number, stage: PassportStage): number {
    return stage.trackId;
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
    return passportShortDate(iso, this._langSvc?.currentLang);
  }

  /**
   * Data lunga con l'anno nella lingua corrente («12 aprile 2026»), per «Completato il» (oc:8703).
   *
   * @param iso Data ISO 8601.
   * @returns La data formattata, vuota se assente.
   */
  longDate(iso: string | null | undefined): string {
    return passportLongDate(iso ?? undefined, this._langSvc?.currentLang);
  }

  /**
   * Km del cammino nella lingua corrente («35,5»), come nell'immagine condivisa (oc:8703).
   *
   * @param value Chilometri.
   * @returns I km formattati.
   */
  km(value: number): string {
    return passportKm(value, this._langSvc?.currentLang);
  }

  /** Lista delle tappe aperta, nello stato completato (oc:8703). */
  get stagesOpen(): boolean {
    return this.stagesOpen$.value;
  }

  /** Apre o chiude la lista delle tappe del cammino completato (oc:8703). */
  toggleStages(): void {
    this.stagesOpen$.next(!this.stagesOpen$.value);
  }

  /**
   * «Condividi il traguardo»: la modale spinge l'anteprima del cammino (oc:8703). Il ritorno da lì
   * non rilegge nulla, come dalla pagina di una tappa: l'anteprima non cambia dati.
   */
  shareRoute(): void {
    this._skipNextEnter = true;
    void this.host?.openRouteSharePreview()?.catch(() => {});
  }

  /**
   * Nome della tappa nella lingua corrente.
   *
   * @param stage Tappa del passaporto.
   * @returns Il nome, vuoto se manca.
   */
  stageLabel(stage: PassportStage): string {
    return stageName(stage, this._langSvc?.currentLang);
  }

  /**
   * Rilegge progresso e stato della richiesta, per esempio dopo un invio. Il progresso si rilegge
   * per tutti quelli che lo mostrano, così badge e anello della home restano allineati (oc:8676).
   */
  refresh(): void {
    this._refresh$.next();
    this._passportSvc.refreshProgress(this.layerId);
  }
}
