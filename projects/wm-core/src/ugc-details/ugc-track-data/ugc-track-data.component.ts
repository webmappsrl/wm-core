import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {UgcTrackStatsService} from '@wm-core/services/ugc-track-stats.service';
import {UgcTrackDetails} from '@wm-core/utils/ugc-track-stats';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

/**
 * Dettagli tecnici di una traccia UGC: `properties.stats` del server quando c'è, altrimenti
 * calcolati al volo con la stessa pulizia GPS del server (oc:8743).
 */
@Component({
  standalone: false,
  selector: 'wm-ugc-track-data',
  templateUrl: './ugc-track-data.component.html',
  styleUrls: ['./ugc-track-data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcTrackDataComponent {
  /**
   * La traccia di cui mostrare i dettagli.
   *
   * @param value la traccia UGC
   */
  @Input('track') set track(value: WmFeature<LineString>) {
    this._track$.next(value);
  }

  private readonly _track$ = new BehaviorSubject<WmFeature<LineString> | null>(null);

  readonly details$: Observable<UgcTrackDetails | null> = this._track$.pipe(
    switchMap(track => (track ? this._ugcTrackStatsSvc.details$(track) : of(null))),
  );

  constructor(private _ugcTrackStatsSvc: UgcTrackStatsService) {}
}
