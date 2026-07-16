import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {GeoJsonProperties} from 'geojson';
import {IGeojsonFeature, IGeojsonProperties} from '../types/model';
import {ISlopeChartHoverElements} from '../types/slope-chart';
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {confOPTIONS, confOPTIONSShowTrackRemainingDistance} from '@wm-core/store/conf/conf.selector';
import {
  trackDistanceCovered,
  trackPositionStale,
  trackRemainingDistance,
} from '@wm-core/store/user-activity/user-activity.selector';

export interface TrackLiveDistanceVm {
  distanceCovered: number | null;
  remainingDistance: number | null;
  stale: boolean;
}

@Component({
  standalone: false,
  selector: 'wm-tab-detail',
  templateUrl: './tab-detail.component.html',
  styleUrls: ['./tab-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDetailComponent {
  @Input()
  properties: GeoJsonProperties;
  @Output('slopeChartHover')
  slopeChartHover: EventEmitter<ISlopeChartHoverElements> =
    new EventEmitter<ISlopeChartHoverElements>();

  confOptions$: Observable<any> = this._store.select(confOPTIONS);
  public route: IGeojsonFeature;

  // Gate su OPTIONS.showTrackRemainingDistance: quando disabilitato le distanze live restano
  // null e le righe Partenza/Arrivo si comportano come prima di oc:8177 (visibili solo se
  // properties.from/to sono presenti). Quando abilitato, distanceCovered/remainingDistance
  // possono valere 0 (traguardo raggiunto/appena partiti): per questo il gate è su `enabled`,
  // non sul valore numerico, altrimenti *ngIf nasconderebbe il badge esattamente a 0.
  trackLiveDistanceVm$: Observable<TrackLiveDistanceVm> = combineLatest([
    this._store.select(trackDistanceCovered),
    this._store.select(trackRemainingDistance),
    this._store.select(trackPositionStale),
    this._store.select(confOPTIONSShowTrackRemainingDistance),
  ]).pipe(
    map(([distanceCovered, remainingDistance, stale, enabled]) => ({
      distanceCovered: enabled !== false ? distanceCovered : null,
      remainingDistance: enabled !== false ? remainingDistance : null,
      stale,
    })),
  );

  constructor(private _store: Store<any>) {}

  onLocationHover(event: ISlopeChartHoverElements) {
    this.slopeChartHover.emit(event);
  }
}
