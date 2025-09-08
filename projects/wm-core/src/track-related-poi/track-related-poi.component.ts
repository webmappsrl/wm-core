import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {WmFeature, WmProperties} from '@wm-types/feature';
import {Point} from 'geojson';
import {
  currentEcRelatedPoiId,
  currentEcRelatedPois,
  currentEcTrackProperties,
} from '@wm-core/store/features/ec/ec.selector';
import {Observable, BehaviorSubject, combineLatest, of} from 'rxjs';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {GeolocationService} from '@wm-core/services/geolocation.service';
import {map, switchMap} from 'rxjs/operators';
import {ICONS} from '@wm-types/config';
import {icons} from '@wm-core/store/icons/icons.selector';

export const MAX_VISIBLE_POIS = 4;
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
  isExpanded$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  icons$: Observable<ICONS> = this._store.select(icons);
  pois$: Observable<WmFeature<Point>[]> = this._store.select(currentEcRelatedPois).pipe(
    switchMap(pois =>
      pois?.length ? combineLatest([
        ...pois.map(poi =>
          this._geolocationSvc.getDistanceFromCurrentLocation$(poi.geometry?.coordinates).pipe(
            map(distance => ({
              ...poi,
              properties: {
                ...poi.properties,
                distanceFromCurrentLocation: distance
              }
            }))
          )
        )
      ]) : of([])
    )
  );
  showExpandButton$ = this.pois$.pipe(
    map(pois => pois && pois.length > MAX_VISIBLE_POIS)
  );
  trackProperties$: Observable<WmProperties> = this._store.select(currentEcTrackProperties);
  visiblePois$ = combineLatest([this.pois$, this.isExpanded$]).pipe(
    map(([pois, isExpanded]) => {
      if (!pois) return [];
      return isExpanded ? pois : pois.slice(0, MAX_VISIBLE_POIS);
    })
  );

  constructor(
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    private _geolocationSvc: GeolocationService,
  ) {}

  selectPoi(poi: WmFeature<Point>) {
    const id = poi?.properties?.id ?? null;
    this._urlHandlerSvc.updateURL({ec_related_poi: id});
  }

  toggleExpand(): void {
    this.isExpanded$.next(!this.isExpanded$.value);
  }
}
