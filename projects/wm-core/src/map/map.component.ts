import {ChangeDetectionStrategy, Component, ViewChild, ViewEncapsulation} from '@angular/core';
import {hitMapFeatureCollection} from '@map-core/store/map-core.selector';
import {select, Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {WmLoadingService} from '@wm-core/services/loading.service';
import {confMAP, confMAPLAYERS} from '@wm-core/store/conf/conf.selector';
import {loadEcPois} from '@wm-core/store/features/ec/ec.actions';
import {
  countSelectedFilters,
  ecPois,
  poiFilterIdentifiers,
} from '@wm-core/store/features/ec/ec.selector';
import {
  openUgc,
  resetPoiFilters,
  resetTrackFilters,
  setLastFilterType,
  setLayer,
  togglePoiFilter,
  toggleTrackFilter,
  updateTrackFilter,
} from '@wm-core/store/user-activity/user-activity.action';
import {Filter, ILAYER, SelectFilterOption, SliderFilter} from '@wm-core/types/config';
import {BehaviorSubject, combineLatest, from, of} from 'rxjs';
import {Observable} from 'rxjs';
import {concatMap, filter, map, switchMap, take, tap} from 'rxjs/operators';
import {
  confJIDOUPDATETIME,
  confShowDrawTrack,
  confAUTHEnable,
} from '@wm-core/store/conf/conf.selector';
import {IDATALAYER} from '@map-core/types/layer';
import {ecLayer, inputTyped, mapFilters} from '@wm-core/store/user-activity/user-activity.selector';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
import {ITrackElevationChartHoverElements} from '@map-core/types/track-elevation-charts';
import {ugcPoiFeatures, ugcTracksFeatures} from '@wm-core/store/features/ugc/ugc.selector';
import {ModalController} from '@ionic/angular';
import {ActivatedRoute, Router} from '@angular/router';
import {ProfileAuthComponent} from '@wm-core/profile/profile-auth/profile-auth.component';
import {extentFromLonLat} from '@map-core/utils';
import {WmHomeComponent} from '@wm-core/home/home.component';
import {WmMapTrackRelatedPoisDirective} from '@map-core/directives';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {WmMapComponent} from '@map-core/components';

const menuOpenLeft = 400;
const menuCloseLeft = 0;
const initPadding = [100, 100, 100, menuOpenLeft];
const initMenuOpened = true;
const maxWidth = 600;
@Component({
  selector: 'wm-core-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmCoreMapComponent {
  private _confMAPLAYERS$: Observable<ILAYER[]> = this._store.select(confMAPLAYERS);

  readonly track$: Observable<WmFeature<LineString> | null>;
  readonly trackColor$: BehaviorSubject<string> = new BehaviorSubject<string>('#caaf15');

  @ViewChild(WmMapTrackRelatedPoisDirective)
  WmMapTrackRelatedPoisDirective: WmMapTrackRelatedPoisDirective;
  @ViewChild(WmHomeComponent) homeCmp: WmHomeComponent;
  @ViewChild(WmMapComponent) mapCmp: WmMapComponent;

  apiElasticState$: Observable<any> = this._store.select(mapFilters);
  apiSearchInputTyped$: Observable<string> = this._store.select(inputTyped);
  authEnable$: Observable<boolean> = this._store.select(confAUTHEnable);
  confJIDOUPDATETIME$: Observable<any> = this._store.select(confJIDOUPDATETIME);
  confMap$: Observable<any> = this._store.select(confMAP).pipe(
    tap(c => {
      if (c != null && c.pois != null && c.pois.apppoisApiLayer == true) {
        this._store.dispatch(loadEcPois());
      }
    }),
  );
  currentCustomTrack$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  currentLayer$ = this._store.select(ecLayer);
  currentPoi$: BehaviorSubject<WmFeature<Point>> = new BehaviorSubject<WmFeature<Point> | null>(
    null,
  );
  currentPoiIDToMap$: Observable<number | null>;
  currentPoiNextID$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  currentRelatedPoi$: BehaviorSubject<WmFeature<Point>> =
    new BehaviorSubject<WmFeature<Point> | null>(null);
  currentUgcPoi$: BehaviorSubject<WmFeature<Point>> = new BehaviorSubject<WmFeature<Point> | null>(
    null,
  );
  currentUgcPoiIDToMap$: Observable<number | null>;
  dataLayerUrls$: Observable<IDATALAYER>;
  drawTrackEnable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  enableDrawTrack$ = this._store.select(confShowDrawTrack);
  graphhopperHost$: Observable<string> = of('https://graphhopper.webmapp.it/');
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  mapPadding$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>(initPadding);
  overlayFeatureCollections$ = this._store.select(hitMapFeatureCollection);
  poiFilterIdentifiers$: Observable<string[]> = this._store.select(poiFilterIdentifiers);
  pois$: Observable<WmFeature<Point>[]> = this._store.select(ecPois);
  refreshLayer$: Observable<any> = this._store.select(countSelectedFilters);
  reloadCustomTracks$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);
  resetSelectedPoi$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  resetSelectedUgcPoi$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  toggleLayerDirective$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  togglePoisDirective$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  toggleUgcDirective$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  trackElevationChartHoverElements$: BehaviorSubject<ITrackElevationChartHoverElements | null> =
    new BehaviorSubject<ITrackElevationChartHoverElements | null>(null);
  translationCallback: (any) => string = value => {
    if (value == null) return '';
    return this._langService.instant(value);
  };
  ugcPois$: Observable<WmFeature<Point>[]> = this._store.select(ugcPoiFeatures);
  ugcTracks$: Observable<WmFeature<LineString>[]> = this._store.select(ugcTracksFeatures);
  wmMapEcPoisDisableLayer$: Observable<boolean>;
  wmMapEcTracksDisableLayer$: Observable<boolean>;
  wmMapFeatureCollectionOverlay$: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(
    null,
  );
  wmMapHitMapUrl$: Observable<string | null> = this.confMap$.pipe(map(conf => conf?.hitMapUrl));
  wmMapUgcDisableLayers$: Observable<boolean>;

  constructor(
    private _store: Store,
    private _langService: LangService,
    private _loadingSvc: WmLoadingService,
    private _modalCtrl: ModalController,
    private _router: Router,
    private _route: ActivatedRoute,
  ) {}

  openPopup(popup: {name: string; html: string}): void {
    this.homeCmp.popup$.next(popup);
  }

  removeTrackFilter(filter: Filter): void {
    this._store.dispatch(toggleTrackFilter({filter}));
  }

  resetFilters(): void {
    this.homeCmp.goToHome();
  }

  saveCurrentCustomTrack(track: any): void {
    const clonedTrack = JSON.parse(JSON.stringify(track));
    this.currentCustomTrack$.next(clonedTrack);
  }

  selectedLayer(layer: any): void {
    this.homeCmp.setLayer(layer);
  }

  selectedLayerById(id: number): void {
    this._confMAPLAYERS$
      .pipe(
        take(1),
        filter(l => l != null),
        map(layers => {
          const layer = layers.filter(l => +l.id === id);
          return layer.length === 1 ? layer[0] : null;
        }),
      )
      .subscribe(layer => {
        this.selectedLayer(layer);
      });
  }

  setCurrentRelatedPoi(poi: WmFeature<Point> | null | number): void {
    if (poi != null) {
      this.currentRelatedPoi$.next(poi as WmFeature<Point>);
      this.WmMapTrackRelatedPoisDirective.setPoi = (poi as WmFeature<Point>).properties
        .id as number;
    }
  }

  setLoader(event: string): void {
    console.log(event);
    switch (event) {
      case 'rendering:layer_start':
        this._loadingSvc.show('Rendering Layer');
        break;
      case 'rendering:layer_done':
        this._loadingSvc.close('Rendering Layer');
        break;
      case 'rendering:pois_start':
        this._loadingSvc.show('Rendering Pois');
        break;
      case 'rendering:pois_done':
        this._loadingSvc.close('Rendering Pois');
        break;
      default:
        this._loadingSvc.close();
    }
  }

  setPoi(poi: any): void {
    this.resetSelectedUgcPoi$.next(!this.resetSelectedUgcPoi$.value);
    this.currentPoi$.next(poi);
  }

  setUgcPoi(poi: WmFeature<Point>): void {
    this.resetSelectedPoi$.next(!this.resetSelectedPoi$.value);
    this.currentUgcPoi$.next(poi);
  }

  setWmMapFeatureCollection(overlay: any): void {
    try {
      this._store.dispatch(setLayer(null));
      this._store.dispatch(resetTrackFilters());
    } catch (_) {}
    this.wmMapFeatureCollectionOverlay$.next(overlay);
    this.overlayFeatureCollections$.pipe(take(1)).subscribe(feature => {
      if (overlay['featureType'] != null && feature[overlay['featureType']] != null) {
        this.wmMapFeatureCollectionOverlay$.next({
          ...overlay,
          ...{url: feature[overlay['featureType']]},
        });
      }
    });
  }

  toggleDirective(data: {type: 'layers' | 'pois' | 'ugc'; toggle: boolean}): void {
    switch (data.type) {
      case 'layers':
        this.toggleLayerDirective$.next(data.toggle);
        break;
      case 'pois':
        this.togglePoisDirective$.next(data.toggle);
        break;
      case 'ugc':
        this.toggleUgcDirective$.next(data.toggle);
    }
  }

  toggleDrawTrackEnabled(): void {
    const currentValue = this.drawTrackEnable$.value;
    combineLatest([this.authEnable$, this.isLogged$])
      .pipe(
        take(1),
        switchMap(([authEnabled, isLogged]) => {
          if (authEnabled) {
            if (isLogged) {
              this.drawTrackEnable$.next(!currentValue);
              this.currentCustomTrack$.next(null);
              this._store.dispatch(setLayer(null));
              this._store.dispatch(resetPoiFilters());
              this._store.dispatch(resetTrackFilters());
              this.updateEcTrack();
            } else {
              return from(
                this._modalCtrl.create({
                  component: ProfileAuthComponent,
                  componentProps: {
                    slide1: 'assets/images/profile/logged_out_slide_1.svg',
                    slide2: 'assets/images/profile/logged_out_slide_2.svg',
                  },
                  id: 'wm-profile-auth-modal',
                }),
              ).pipe(concatMap(modal => from(modal.present())));
            }
          } else {
            this.drawTrackEnable$.next(!currentValue);
            this.currentCustomTrack$.next(null);
          }
        }),
      )
      .subscribe();
  }

  updateEcTrack(track = undefined): void {
    this.currentLayer$.pipe(take(1)).subscribe(layer => {
      this.mapCmp.fitView(extentFromLonLat(layer.bbox), {duration: 1000});
    });
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {ugc_track: undefined, track},
      queryParamsHandling: 'merge',
    });
  }

  updateLastFilterType(filter: 'tracks' | 'pois'): void {
    this._store.dispatch(setLastFilterType({filter}));
  }

  updatePoiFilter(filter: SelectFilterOption | SliderFilter | Filter): void {
    this._store.dispatch(togglePoiFilter({filterIdentifier: filter.identifier}));
  }

  updateTrackFilter(filterGeneric: SelectFilterOption | SliderFilter | Filter): void {
    let filter = filterGeneric as Filter;
    if (filter.type === 'slider') {
      this._store.dispatch(updateTrackFilter({filter}));
    } else {
      this._store.dispatch(toggleTrackFilter({filter}));
    }
  }

  updateUgcTrack(ugc_track = undefined): void {
    this._store.dispatch(openUgc());
    this.homeCmp.setTrack(ugc_track);
    this._router.navigate([], {
      relativeTo: this._route,
      queryParams: {track: undefined, ugc_track},
      queryParamsHandling: 'merge',
    });
  }
}
