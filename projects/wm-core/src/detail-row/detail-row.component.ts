import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

/**
 * Una riga dei dettagli tecnici: icona, etichetta tradotta e valore proiettato. Condivisa da
 * `wm-tab-detail` (ecTrack, POI, traccia disegnata) e `wm-ugc-track-data` (traccia UGC), così
 * aspetto e classi stanno in un solo posto (oc:8743). Quale riga mostrare e come scrivere il
 * valore restano al pannello che la usa.
 */
@Component({
  standalone: false,
  selector: 'wm-detail-row',
  templateUrl: './detail-row.component.html',
  styleUrls: ['./detail-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDetailRowComponent {
  /** Classe dell'icona, per esempio `icon-outline-distance`; senza, la riga non ha icona. */
  @Input() icon: string | null = null;
  /** Chiave di traduzione dell'etichetta. */
  @Input() label = '';
}
