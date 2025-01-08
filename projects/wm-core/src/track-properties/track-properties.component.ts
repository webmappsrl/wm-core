import {Component, ChangeDetectionStrategy, Input, ViewEncapsulation} from '@angular/core';
import {ITrackElevationChartHoverElements} from '@map-core/types/track-elevation-charts';
import {Store} from '@ngrx/store';
import {confOPTIONS} from '@wm-core/store/conf/conf.selector';
import {currentEcTrack, currentEcTrackProperties} from '@wm-core/store/features/ec/ec.selector';
import {trackElevationChartHoverElemenents} from '@wm-core/store/user-activity/user-activity.action';
import {ecLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {IOPTIONS} from '@wm-core/types/config';
import {LineStringProperties, WmFeature, WmProperties} from '@wm-types/feature';
import {LineString} from 'geojson';
import {Observable} from 'rxjs';
@Component({
  selector: 'wm-track-properties',
  templateUrl: './track-properties.component.html',
  styleUrls: ['./track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackPropertiesComponent {
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  currentLayer$ = this._store.select(ecLayer);
  ecTrack$: Observable<WmFeature<LineString>> = this._store.select(currentEcTrack);
  ecTrackProperties$: Observable<LineStringProperties> =
    this._store.select(currentEcTrackProperties);

  constructor(private _store: Store) {}

  onLocationHover(event: ITrackElevationChartHoverElements | any): void {
    this._store.dispatch(trackElevationChartHoverElemenents({elements: event}));
  }
}
