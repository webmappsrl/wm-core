import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {PassportStage} from '@wm-types/passport';
import {LangService} from '@wm-core/localization/lang.service';
import {passportShortDate, stageName} from '../passport.utils';

/** Operazioni della modale host usate dalla pagina della tappa. */
export interface PassportStageDetailHost {
  back(): Promise<void>;
}

/**
 * Pagina di una tappa nel passaporto (oc:8676, vista 3 del wireframe): spinta nell'`ion-nav` della
 * modale dal tocco su una riga del dettaglio. Mostra nome, stato e distanza della tappa. Non è il
 * dettaglio tappa della mappa (`wm-track-properties`), che non mostra ancora lo stato.
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
  /** Modale host, per tornare al dettaglio. */
  @Input() host: PassportStageDetailHost;

  constructor(private _langSvc: LangService) {}

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

  /** Nome della tappa nella lingua corrente. */
  get title(): string {
    return stageName(this.stage, this._langSvc.currentLang);
  }
}
