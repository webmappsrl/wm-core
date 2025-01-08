import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {GeoutilsService} from '@wm-core/services/geoutils.service';
import {LineString} from 'geojson';
import {BehaviorSubject} from 'rxjs';
import {WmFeature} from 'src/app/shared/wm-types/src';

@Component({
  selector: 'wm-ugc-track-data',
  templateUrl: './ugc-track-data.component.html',
  styleUrls: ['./ugc-track-data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcTrackDataComponent {
  @Input('track') set track(value: WmFeature<LineString>) {
    this.time$.next(this._geoutilsSvc.getTime(value));
    this.trackLength$.next(this._geoutilsSvc.getLength(value));
    this.slope$.next(this._geoutilsSvc.getSlope(value));
    this.avgSpeed$.next(this._geoutilsSvc.getAverageSpeed(value));
    this.topSpeed$.next(this._geoutilsSvc.getTopSpeed(value));
  }

  avgSpeed$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
  slope$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
  time$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
  topSpeed$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);
  trackLength$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);

  constructor(private _geoutilsSvc: GeoutilsService) {}
}
