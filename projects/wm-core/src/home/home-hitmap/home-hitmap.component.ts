import {HttpClient} from '@angular/common/http';
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confMAP} from '@wm-core/store/conf/conf.selector';
import {wmMapHitMapChangeFeatureById} from '@wm-core/store/user-activity/user-activity.action';
import {Feature, FeatureCollection} from 'geojson';
import {Observable, of} from 'rxjs';
import {catchError, filter, map, switchMap} from 'rxjs/operators';

@Component({
  selector: 'wm-home-hitmap',
  templateUrl: './home-hitmap.component.html',
  styleUrls: ['./home-hitmap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeHitMapComponent {
  confMAP$: Observable<any> = this._store.select(confMAP);
  searchTerm: string = '';

  wmMapHitMap$: Observable<FeatureCollection> = this.confMAP$.pipe(
    filter(conf => conf != null),
    map(conf => conf?.hitMapUrl),
    switchMap(url => {
      return this._http.get(url) as Observable<FeatureCollection>;
    }),
    catchError(err => of(null)),
  );

  onClick(feature: Feature): void {
    const properties = feature.properties;
    this._store.dispatch(wmMapHitMapChangeFeatureById({id: properties.id}));
    this._urlHandlerSvc.changeURL('map');
  }
  constructor(
    private _store: Store,
    private _http: HttpClient,
    private _urlHandlerSvc: UrlHandlerService,
  ) {}
}
