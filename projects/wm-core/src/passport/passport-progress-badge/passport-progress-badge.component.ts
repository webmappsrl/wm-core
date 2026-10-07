import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {PassportService} from '../passport.service';
import {toLayerId} from '../passport.utils';
import {PassportModalService} from '../passport-modal/passport-modal.service';

/** Dati mostrati dal badge. */
export interface PassportBadgeVm {
  percent: number;
  completed: number;
  total: number;
}

/**
 * Badge di avanzamento del cammino nella home del layer camminiditalia (oc:8166, wireframe V0b).
 * Autonomo: si inietta da sé service e store, così la variante di `wm-home-layer` non tocca il
 * costruttore della classe base. Non compare per l'utente non loggato né per un layer senza track.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-progress-badge',
  templateUrl: './passport-progress-badge.component.html',
  styleUrls: ['./passport-progress-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportProgressBadgeComponent implements OnChanges {
  /** Id del layer: in `ILAYER` è una stringa, viene convertito in numero. */
  @Input() layerId: string | number | null;
  @Input() layerTitle: string;
  /** Logo e immagine del layer, per l'intestazione del dettaglio (wireframe V1/V3). */
  @Input() layerLogo: string;
  @Input() layerImage: string;

  vm$: Observable<PassportBadgeVm | null> = of(null);

  constructor(
    private _passportSvc: PassportService,
    private _passportModalSvc: PassportModalService,
  ) {}

  /** Id del layer come numero, `null` se assente. */
  get numericLayerId(): number | null {
    return toLayerId(this.layerId);
  }

  /**
   * Ricalcola i dati del badge solo quando cambia il layer: un cambio del titolo (per esempio
   * al cambio lingua) ricreerebbe lo stream e il badge sparirebbe finché non riemette.
   *
   * @param changes Input cambiati.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['layerId']) return;
    this.vm$ = this._passportSvc
      .visibleProgress(this.numericLayerId)
      .pipe(map(p => (p ? {percent: p.percent, completed: p.completedStages, total: p.totalStages} : null)));
  }

  /**
   * Apre la modale a tutto schermo con il dettaglio del cammino, con il service comune al
   * passaporto a timbri (oc:8703), che alla chiusura rilegge il progresso del layer.
   */
  async openDetail(): Promise<void> {
    await this._passportModalSvc.open({
      layerId: this.numericLayerId,
      layerTitle: this.layerTitle,
      layerLogo: this.layerLogo,
      layerImage: this.layerImage,
    });
  }
}
