import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {UgcTrackPropertiesBaseComponent} from './ugc-track-properties-base.component';

// il tipo resta esportato da qui: l'app lo importa da questo percorso (`ShareService`, `MapPageBase`)
export type {UgcTrackShareResult} from './ugc-track-properties-base.component';

/** Dettaglio di una traccia UGC, default: senza esperienze collegate (oc:8169). */
@Component({
  standalone: false,
  selector: 'wm-ugc-track-properties',
  templateUrl: './ugc-track-properties.component.html',
  styleUrls: ['./ugc-track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcTrackPropertiesComponent extends UgcTrackPropertiesBaseComponent {}
