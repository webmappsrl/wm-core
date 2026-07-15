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
}
