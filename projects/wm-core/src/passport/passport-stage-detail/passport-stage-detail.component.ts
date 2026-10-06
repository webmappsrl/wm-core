import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import {PassportStage} from '@wm-types/passport';
import {LangService} from '@wm-core/localization/lang.service';
import {passportShortDate, stageName} from '../passport.utils';

/** Operazioni della modale host usate dalla pagina della tappa. */
export interface PassportStageDetailHost {
  back(): Promise<void>;
  /** Apre l'anteprima della condivisione della tappa (oc:8702). */
  openSharePreview(stage: PassportStage): Promise<void>;
}

/**
 * Pagina di una tappa nel passaporto (oc:8676, vista 3 del wireframe): spinta nell'`ion-nav` della
 * modale dal tocco su una riga del dettaglio. Mostra foto, nome, stato, distanza e dislivelli della
 * tappa e, se il backend la dichiara condivisibile, il pulsante «Condividi» (oc:8702). Non è il
 * dettaglio tappa della mappa (`wm-track-properties`), che non mostra ancora lo stato.
 *
 * «Condividi» non genera nulla: apre l'anteprima (`wm-passport-share-preview`) nella stessa
 * `ion-nav`, dove si genera l'immagine e si sceglie come condividerla.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-stage-detail',
  templateUrl: './passport-stage-detail.component.html',
  styleUrls: ['./passport-stage-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportStageDetailComponent {
  @Input() stage: PassportStage;
  @Input() layerTitle: string;
  /** Modale host, per tornare al dettaglio e aprire l'anteprima della condivisione. */
  @Input() host: PassportStageDetailHost;

  /** Vero dopo un errore di caricamento della foto: il blocco sparisce. */
  imageFailed = false;

  constructor(
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
  ) {}

  /** Tappa riconosciuta all'utente. */
  get done(): boolean {
    return this.stage?.status === 'completed';
  }

  /** Testo del chip di stato, come nel wireframe («percorsa il 12 mag»). */
  get chipLabel(): string {
    if (!this.done) return this._langSvc.instant('non ancora percorsa');
    const date = passportShortDate(this.stage.completedAt, this._langSvc.currentLang);
    return this._langSvc.instant('percorsa il {{date}}', {date});
  }

  /** La distanza manca in molti dati: senza, la riga non si mostra invece di dire «0 Km». */
  get showDistance(): boolean {
    return (this.stage?.distance ?? 0) > 0;
  }

  /** Dislivello positivo da mostrare: la riga c'è solo con un valore maggiore di zero. */
  get showAscent(): boolean {
    return (this.stage?.ascent ?? 0) > 0;
  }

  /** Dislivello negativo da mostrare: la riga c'è solo con un valore maggiore di zero. */
  get showDescent(): boolean {
    return (this.stage?.descent ?? 0) > 0;
  }

  /** La foto si mostra solo se c'è e si è caricata (senza rete l'`<img>` va in errore). */
  get showImage(): boolean {
    return !!this.stage?.image && !this.imageFailed;
  }

  /** «Condividi» compare solo se il backend dichiara la tappa condivisibile. */
  get shareable(): boolean {
    return this.stage?.shareable === true;
  }

  /** Nome della tappa nella lingua corrente. */
  get title(): string {
    return stageName(this.stage, this._langSvc.currentLang);
  }

  /** Nasconde il blocco della foto quando l'immagine non si carica. */
  onImageError(): void {
    this.imageFailed = true;
    this._cdr.markForCheck();
  }

  /**
   * Tocco su «Condividi»: apre l'anteprima della condivisione nella modale. Un push rifiutato
   * dall'`ion-nav` lascia la pagina com'è, senza promise rifiutate non gestite.
   */
  openSharePreview(): void {
    void this.host?.openSharePreview(this.stage)?.catch(() => {});
  }
}
