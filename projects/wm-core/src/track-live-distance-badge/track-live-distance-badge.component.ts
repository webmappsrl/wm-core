import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  standalone: false,
  selector: 'wm-track-live-distance-badge',
  templateUrl: './track-live-distance-badge.component.html',
  styleUrls: ['./track-live-distance-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTrackLiveDistanceBadgeComponent {
  @Input() distanceMeters: number | null = null;
  @Input() stale = false;
  // Di default il badge mostra "<distanza> da te" (comportamento esistente in tab-detail,
  // oc:8177). A `false` mostra solo la distanza — usato nel box di registrazione (oc:8284),
  // dove il contesto ("PARTENZA"/"ARRIVO" già in etichetta) rende "da te" ridondante.
  @Input() showSuffix = true;
}
