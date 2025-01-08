import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {WmFeature, WmProperties} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
import {
  currentEcRelatedPoiId,
  currentEcRelatedPois,
  currentEcTrackProperties,
} from '@wm-core/store/features/ec/ec.selector';
import {Observable} from 'rxjs';
import {setCurrentRelatedPoi} from '@wm-core/store/user-activity/user-activity.action';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
@Component({
  selector: 'wm-track-related-poi',
  templateUrl: './track-related-poi.component.html',
  styleUrls: ['./track-related-poi.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackRelatedPoiComponent {
  @Output('poi-click') poiClick: EventEmitter<WmFeature<Point> | null> =
    new EventEmitter<WmFeature<Point> | null>();

  currentPoi: WmFeature<Point> = null;
  currentRelatedEcPid$ = this._store.select(currentEcRelatedPoiId);
  defaultPhotoPath = '/assets/icon/no-photo.svg';
  pois$: Observable<WmFeature<Point>[]> = this._store.select(currentEcRelatedPois);
  trackProperties$: Observable<WmProperties> = this._store.select(currentEcTrackProperties);

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {}

  selectPoi(poi: WmFeature<Point>) {
    const id = poi?.properties?.id ?? null;
    this._urlHandlerSvc.updateURL({ec_related_poi: id});
  }
}
