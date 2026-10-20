import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {TrackPropertiesBaseComponent} from './track-properties-base.component';

/** Dettaglio di una traccia, default: senza sezione delle esperienze (oc:8169). */
@Component({
  standalone: false,
  selector: 'wm-track-properties',
  templateUrl: './track-properties.component.html',
  styleUrls: ['./track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackPropertiesComponent extends TrackPropertiesBaseComponent {}
