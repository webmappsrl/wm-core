import {HttpClient} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {ToastController} from '@ionic/angular';
import {removeHitmapFeature, getHitmapFeatures} from '@map-core/utils';
import {Store} from '@ngrx/store';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confMAP, confMAPHitMapUrl} from '@wm-core/store/conf/conf.selector';
import {wmMapHitMapChangeFeatureById} from '@wm-core/store/user-activity/user-activity.action';
import {WmFeature} from '@wm-types/feature';
import {Feature, FeatureCollection, MultiPolygon} from 'geojson';
import {from, Observable, of} from 'rxjs';
import {catchError, filter, map, switchMap, take} from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'wm-home-hitmap',
  templateUrl: './home-hitmap.component.html',
  styleUrls: ['./home-hitmap.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeHitMapComponent implements OnInit {
  confMAP$: Observable<any> = this._store.select(confMAP);
  confMAPHitMapUrl$: Observable<string | null> = this._store.select(confMAPHitMapUrl);
  searchTerm: string = '';

  @Input()
  downloads: boolean = false;

  downloadedHitmapFeatures$: Observable<WmFeature<MultiPolygon>[]> = from(getHitmapFeatures());

  hitmapFeatures$: Observable<WmFeature<MultiPolygon>[]> = this.confMAP$.pipe(
    filter(conf => conf != null),
    map(conf => conf?.hitMapUrl),
    switchMap((url: string) => {
      return this._http.get(url) as Observable<FeatureCollection>;
    }),
    map(featureCollection => featureCollection.features as WmFeature<MultiPolygon>[]),
    catchError(err => of(null)),
  );

  features$: Observable<WmFeature<MultiPolygon>[]>;

  onClick(feature: Feature): void {
    const properties = feature.properties;
    this._store.dispatch(wmMapHitMapChangeFeatureById({id: properties.id}));
    this._urlHandlerSvc.changeURL('map');
  }

  ngOnInit(): void {
    this.refresh();
  }

  constructor(
    private _store: Store,
    private _http: HttpClient,
    private _urlHandlerSvc: UrlHandlerService,
    private _cdr: ChangeDetectorRef,
    private _toastCtrl: ToastController,
  ) {}

  async deleteSheet(feature: Feature): Promise<void> {
    // Da implementare
    await removeHitmapFeature(feature.properties.id);
    this.refresh();
    const toast = await this._toastCtrl.create({
      message: 'Dati eliminati con successo',
      duration: 2000,
    });
    await toast.present();
  }

  refresh(): void {
    this.features$ = this.downloads ? from(getHitmapFeatures()) : this.hitmapFeatures$;
    this._cdr.detectChanges();
  }
}
