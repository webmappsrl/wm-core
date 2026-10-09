import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {confMAPLAYERS} from '@wm-core/store/conf/conf.selector';
import {ILAYER} from '@wm-core/types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {wmTranslate} from '@wm-core/pipes/wmtrans.utils';
import {PassportRoutesState, PassportService} from '../passport.service';
import {PassportModalService} from '../passport-modal/passport-modal.service';
import {
  PassportStamp,
  passportRingDegrees,
  passportStamps,
  stampInitials,
} from '../passport.utils';

/** Dati del passaporto a timbri. */
export type PassportStampsVm =
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'ready'; stamps: PassportStamp[]; anyStarted: boolean};

/**
 * Passaporto a timbri (oc:8703, viste 5b e 5c del wireframe): tutti i cammini della config, col
 * logo nell'anello di avanzamento. In cima gli in corso, poi i completati, poi i non iniziati in
 * grigio. Toccando un timbro, di qualunque stato, si apre il dettaglio del cammino. Lo monta la
 * pagina del tab Passaporto dell'app camminiditalia.
 *
 * Finché `/api/passport` e la config dei layer non hanno risposto mostra il caricamento, mai la
 * griglia grigia: chi ha cammini iniziati non deve vederli spenti per un problema di rete.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-stamps',
  templateUrl: './passport-stamps.component.html',
  styleUrls: ['./passport-stamps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportStampsComponent {
  readonly vm$: Observable<PassportStampsVm>;

  constructor(
    private _store: Store,
    private _passportSvc: PassportService,
    private _passportModalSvc: PassportModalService,
    private _langSvc: LangService,
  ) {
    this.vm$ = combineLatest([
      this._passportSvc.passportRoutesState$(),
      this._store.select(confMAPLAYERS),
    ]).pipe(map(([state, layers]) => this._toVm(state, layers)));
  }

  /**
   * Apre il dettaglio del cammino, rileggendo subito il progresso: il timbro può essere più
   * aggiornato del progresso già in memoria.
   *
   * @param stamp Timbro toccato.
   */
  open(stamp: PassportStamp): void {
    void this._passportModalSvc
      .open(
        {
          layerId: stamp.layerId,
          layerTitle: this.title(stamp),
          layerLogo: stamp.logo ?? undefined,
          layerImage: stamp.image ?? undefined,
        },
        {refresh: true},
      )
      .catch(() => {});
  }

  /** Tocco su «Riprova» dopo un errore di lettura. */
  retry(): void {
    this._passportSvc.refreshPassport();
  }

  /**
   * Nome del cammino nella lingua corrente, con la stessa regola della pipe `wmtrans`: il titolo
   * della config può essere un testo o un oggetto per lingua.
   *
   * @param stamp Timbro.
   * @returns Il nome tradotto.
   */
  title(stamp: PassportStamp): string {
    return wmTranslate(stamp.title, this._langSvc);
  }

  /**
   * Iniziali del cammino, al posto del logo quando la config non ne ha uno.
   *
   * @param stamp Timbro.
   * @returns Le iniziali del nome nella lingua corrente.
   */
  initialsOf(stamp: PassportStamp): string {
    return stampInitials(this.title(stamp));
  }

  /**
   * Etichetta accessibile del timbro: lo stato a parole, non solo nel colore.
   *
   * @param stamp Timbro.
   * @returns Nome e stato del cammino.
   */
  ariaLabel(stamp: PassportStamp): string {
    const cammino = this.title(stamp);
    if (stamp.status === 'completed')
      return this._langSvc.instant('{{cammino}}, completato', {cammino});
    if (stamp.status === 'in_progress') {
      return this._langSvc.instant('{{cammino}}, {{validated}} di {{total}} tappe', {
        cammino,
        validated: stamp.validated,
        total: stamp.total,
      });
    }
    return this._langSvc.instant('{{cammino}}, non iniziato', {cammino});
  }

  /**
   * Gradi dell'arco verde dell'anello.
   *
   * @param stamp Timbro.
   * @returns Gradi 0-360: pieno per i completati, vuoto per i non iniziati.
   */
  ringDegrees(stamp: PassportStamp): number {
    return stamp.status === 'completed' ? 360 : passportRingDegrees(stamp.percent);
  }

  /**
   * Identità dei timbri per `*ngFor`.
   *
   * @param _index Posizione.
   * @param stamp Timbro.
   * @returns L'id del cammino.
   */
  trackStamp(_index: number, stamp: PassportStamp): number {
    return stamp.layerId;
  }

  /**
   * Stato della vista dallo stato della lettura e dalla config.
   *
   * @param state Stato di `/api/passport`.
   * @param layers Layer della config, `undefined` finché non arriva.
   * @returns I dati della vista.
   */
  private _toVm(state: PassportRoutesState, layers: ILAYER[] | undefined): PassportStampsVm {
    if (state.status === 'error') return {status: 'error'};
    // `logged-out` resta in caricamento: la pagina del tab porta alla Home
    if (state.status !== 'ready' || layers == null) return {status: 'loading'};
    const stamps = passportStamps(layers, state.routes);
    return {status: 'ready', stamps, anyStarted: stamps.some(s => s.status !== 'not_started')};
  }
}
