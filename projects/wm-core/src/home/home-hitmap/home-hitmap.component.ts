import {HttpClient} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confMAP} from '@wm-core/store/conf/conf.selector';
import {wmMapHitMapChangeFeatureById} from '@wm-core/store/user-activity/user-activity.action';
import {WmFeature} from '@wm-types/feature';
import {Feature, FeatureCollection, MultiPolygon} from 'geojson';
import {Observable, of} from 'rxjs';
import {catchError, filter, map, switchMap, take} from 'rxjs/operators';

@Component({
  selector: 'wm-home-hitmap',
  templateUrl: './home-hitmap.component.html',
  styleUrls: ['./home-hitmap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeHitMapComponent implements OnInit {
  confMAP$: Observable<any> = this._store.select(confMAP);
  searchTerm: string = '';

  @Input()
  hitmapFeatures: WmFeature<MultiPolygon>[] = [];

  wmMapHitMap$: Observable<WmFeature<MultiPolygon>[]> = this.confMAP$.pipe(
    filter(conf => conf != null),
    map(conf => conf?.hitMapUrl),
    switchMap((url: string) => {
      return this._http.get(url) as Observable<FeatureCollection>;
    }),
    map(featureCollection => featureCollection.features),
    catchError(err => of(null)),
  );

  onClick(feature: Feature): void {
    const properties = feature.properties;
    this._store.dispatch(wmMapHitMapChangeFeatureById({id: properties.id}));
    this._urlHandlerSvc.changeURL('map');
  }

  ngOnInit(): void {
    if (this.hitmapFeatures == null || this.hitmapFeatures.length === 0) {
      this.wmMapHitMap$.pipe(take(1)).subscribe(features => {
        this.hitmapFeatures = features;
        this._cdr.detectChanges();
      });
    }
  }

  constructor(
    private _store: Store,
    private _http: HttpClient,
    private _urlHandlerSvc: UrlHandlerService,
    private _cdr: ChangeDetectorRef,
  ) {}
}
