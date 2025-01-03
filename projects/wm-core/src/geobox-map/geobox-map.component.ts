import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {hitMapFeatureCollection} from '@map-core/store/map-core.selector';
import {select, Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {
  confGeohubId,
  confHOME,
  confLANGUAGES,
  confMAP,
  confMAPLAYERS,
  confOPTIONS,
} from '@wm-core/store/conf/conf.selector';
import {loadEcPois} from '@wm-core/store/features/ec/ec.actions';
import {
  allEcpoiFeatures,
  countSelectedFilters,
  currentEcRelatedPoi,
  currentEcTrack,
  currentEcRelatedPoiId,
  currentEcPoiId,
  ecPois,
} from '@wm-core/store/features/ec/ec.selector';
import {
  drawTrackOpened as ActiondrawTrackOpened,
  goToHome,
  openUgc,
  resetPoiFilters,
  resetTrackFilters,
  setLastFilterType,
  setLayer,
  startLoader,
  stopLoader,
  togglePoiFilter,
  toggleTrackFilter,
  updateTrackFilter,
} from '@wm-core/store/user-activity/user-activity.action';
import {
  Filter,
  IHOME,
  ILAYER,
  IOPTIONS,
  SelectFilterOption,
  SliderFilter,
} from '@wm-core/types/config';
import {BehaviorSubject, combineLatest, from, merge, of, Subscription} from 'rxjs';
import {Observable} from 'rxjs';
import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import {
  confJIDOUPDATETIME,
  confShowDrawTrack,
  confAUTHEnable,
} from '@wm-core/store/conf/conf.selector';
import {currentCustomTrack as currentCustomTrackAction} from '@wm-core/store/features/ugc/ugc.actions';
import {IDATALAYER} from '@map-core/types/layer';
import {
  drawTrackOpened,
  ecLayer,
  inputTyped,
  loading,
  mapFilters,
  poiFilterIdentifiers,
  ugcOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
import {ITrackElevationChartHoverElements} from '@map-core/types/track-elevation-charts';
import {
  currentCustomTrack,
  currentUgcPoi,
  currentUgcTrack,
  ugcPoiFeatures,
  ugcTracksFeatures,
} from '@wm-core/store/features/ugc/ugc.selector';
import {ModalController} from '@ionic/angular';
import {ProfileAuthComponent} from '@wm-core/profile/profile-auth/profile-auth.component';
import {extentFromLonLat} from '@map-core/utils';
import {WmHomeComponent} from '@wm-core/home/home.component';
import {WmMapTrackRelatedPoisDirective} from '@map-core/directives';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {WmMapComponent} from '@map-core/components';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {poi, track} from '@wm-core/store/features/features.selector';
import {FiltersComponent} from '@wm-core/filters/filters.component';
import {ActivatedRoute} from '@angular/router';
import {Actions, ofType} from '@ngrx/effects';
import {currentUgcPoiId} from '@wm-core/store/features/ugc/ugc.selector';
import {EnvironmentConfig, ENVIRONMENT_CONFIG} from '@wm-core/store/conf/conf.token';

const menuOpenLeft = 400;
const menuCloseLeft = 0;
const initPadding = [100, 100, 100, menuOpenLeft];
const initMenuOpened = true;
const maxWidth = 600;
@Component({
  selector: 'wm-geobox-map',
  templateUrl: './geobox-map.component.html',
  styleUrls: ['./geobox-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmGeoboxMapComponent implements OnDestroy {
  private _confMAPLAYERS$: Observable<ILAYER[]> = this._store.select(confMAPLAYERS);

  readonly ecTrack$: Observable<WmFeature<LineString> | null>;
  readonly ecTrackID$: BehaviorSubject<number | string> = new BehaviorSubject<number | string>(
    null,
  );
  readonly track$ = this._store.select(track);
  readonly trackColor$: BehaviorSubject<string> = new BehaviorSubject<string>('#caaf15');
  readonly ugcOpened$: Observable<boolean> = this._store.select(ugcOpened);
  readonly ugcPoi$: Observable<WmFeature<Point> | null> = this._store.select(currentUgcPoi);
  readonly ugcTrack$: Observable<WmFeature<LineString> | null> =
    this._store.select(currentUgcTrack);
  readonly ugcTrackID$: BehaviorSubject<number | string> = new BehaviorSubject<number | string>(
    null,
  );

  @ViewChild(WmMapTrackRelatedPoisDirective)
  WmMapTrackRelatedPoisDirective: WmMapTrackRelatedPoisDirective;
  @ViewChild('filterCmp') filterCmp: FiltersComponent;
  @ViewChild(WmHomeComponent) homeCmp: WmHomeComponent;
  @ViewChild(WmMapComponent) mapCmp: WmMapComponent;

  apiElasticState$: Observable<any> = this._store.select(mapFilters);
  apiSearchInputTyped$: Observable<string> = this._store.select(inputTyped);
  authEnable$: Observable<boolean> = this._store.select(confAUTHEnable);
  caretOutLine$: Observable<'caret-back-outline' | 'caret-forward-outline'>;
  confHOME$: Observable<IHOME[]> = this._store.select(confHOME);
  confJIDOUPDATETIME$: Observable<any> = this._store.select(confJIDOUPDATETIME);
  confMap$: Observable<any> = this._store.select(confMAP).pipe(
    tap(c => {
      if (c != null && c.pois != null && c.pois.apppoisApiLayer == true) {
        this._store.dispatch(loadEcPois());
      }
    }),
  );
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  currentCustomTrack$: Observable<WmFeature<LineString>> = this._store.select(currentCustomTrack);
  currentEcPoiId$ = this._store.select(currentEcPoiId);
  currentLayer$ = this._store.select(ecLayer);
  currentPoi$ = this._store.select(poi);
  currentPoiNextID$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  currentPoiPrevID$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  currentRelatedPoi$ = this._store.select(currentEcRelatedPoi);
  currentRelatedPoiID$ = this._store.select(currentEcRelatedPoiId);
  currentUgcPoiIDToMap$: Observable<number | null>;
  dataLayerUrls$: Observable<IDATALAYER>;
  drawTrackOpened$: Observable<boolean> = this._store.select(drawTrackOpened);
  geohubId$ = this._store.select(confGeohubId);
  goToHomeSub$: Subscription = Subscription.EMPTY;
  graphhopperHost$: Observable<string> = of(this.environment.graphhopperHost);
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  langs$ = this._store.select(confLANGUAGES).pipe(
    tap(l => {
      if (l && l.default) {
        this._langService.initLang(l.default);
      }
    }),
  );
  leftPadding$: Observable<number>;
  loading$: Observable<boolean> = this._store.select(loading);
  mapPadding$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>(initPadding);
  mergedPoi$: Observable<any> = combineLatest([
    merge(
      this.currentPoi$.pipe(
        distinctUntilChanged(),
        map(p => {
          if (p == null) return null;
          if (this.WmMapTrackRelatedPoisDirective) {
            this.WmMapTrackRelatedPoisDirective.setPoi = -1;
          }
          return p;
        }),
      ),
      this.currentRelatedPoi$.pipe(distinctUntilChanged()),
      this.ugcPoi$.pipe(
        distinctUntilChanged(),
        map(p => {
          if (p == null) return null;
          return p;
        }),
      ),
    ),
  ]).pipe(
    map(([poi]) => {
      if (poi == null) return null;
      let id = null;
      if (typeof poi === 'number') {
        id = poi;
      } else {
        id = poi.properties.id;
      }

      return poi;
    }),
  );
  overlayFeatureCollections$ = this._store.select(hitMapFeatureCollection);
  poiFilterIdentifiers$: Observable<string[]> = this._store.select(poiFilterIdentifiers);
  poiIDs$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([]);
  pois$: Observable<WmFeature<Point>[]> = this._store.select(ecPois);
  refreshLayer$: Observable<any>;
  reloadCustomTracks$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);
  resetSelectedPoi$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  resetSelectedUgcPoi$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  resizeEVT: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  setCurrentPoiSub$: Subscription = Subscription.EMPTY;
  showDrawTrackButton$ = this._store.select(confShowDrawTrack);
  showMenu$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(initMenuOpened);
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
    private _route: ActivatedRoute,
    private _cdr: ChangeDetectorRef,
    private _store: Store,
    private _langService: LangService,
    private _modalCtrl: ModalController,
    private _actions$: Actions,
    private _urlHandlerSvc: UrlHandlerService,
    @Inject(ENVIRONMENT_CONFIG) public environment: EnvironmentConfig,
  ) {
    this.refreshLayer$ = this._store.select(countSelectedFilters);
    if (window.innerWidth < maxWidth) {
      this.mapPadding$.next([initPadding[0], initPadding[1], initPadding[2], menuCloseLeft]);
      this.resizeEVT.next(!this.resizeEVT.value);
    }
    this.dataLayerUrls$ = this.geohubId$.pipe(
      filter(g => g != null),
      map(geohubId => {
        return {
          low: `https://wmpbf.s3.eu-central-1.amazonaws.com/${geohubId}/{z}/{x}/{y}.pbf`,
          high: `https://wmpbf.s3.eu-central-1.amazonaws.com/${geohubId}/{z}/{x}/{y}.pbf`,
        } as IDATALAYER;
      }),
    );
    this.setCurrentPoiSub$ = this._store
      .select(allEcpoiFeatures)
      .pipe(
        filter(p => p != null),
        switchMap(_ => this._route.queryParams),
        filter(params => params != null),
        debounceTime(500),
      )
      .subscribe(params => {
        this.setCurrentPoi(params.poi);
      });

    this.ecTrack$ = this._store.select(currentEcTrack).pipe(
      tap(track => {
        if (track != null) {
          const poiIDs = (track.properties?.related_pois || []).map(poi => poi.properties.id);
          this.poiIDs$.next(poiIDs);
        } else {
          this.poiIDs$.next([]);
        }
      }),
    );

    this.caretOutLine$ = this.showMenu$.pipe(
      map(showMenu => (showMenu ? 'caret-back-outline' : 'caret-forward-outline')),
    );
    this.leftPadding$ = this.showMenu$.pipe(map(showMenu => (showMenu ? menuOpenLeft : 0)));

    this.currentUgcPoiIDToMap$ = this._store.select(currentUgcPoiId);
    this._actions$.pipe(ofType(goToHome)).subscribe(() => {
      this.unselectPOI();
      this.mapCmp.resetView();
    });

    this.wmMapEcTracksDisableLayer$ = combineLatest([
      this.drawTrackOpened$,
      this.toggleLayerDirective$,
      this.currentLayer$,
    ]).pipe(
      map(([drawTrackEnable, toggleLayerDirective, currentLayer]) => {
        return drawTrackEnable || (!toggleLayerDirective && currentLayer == null);
      }),
    );
    this.wmMapEcPoisDisableLayer$ = combineLatest([
      this.drawTrackOpened$,
      this.togglePoisDirective$,
    ]).pipe(
      map(([drawTrackOpened, togglePoiDirective]) => {
        return drawTrackOpened || !togglePoiDirective;
      }),
    );

    this.wmMapUgcDisableLayers$ = combineLatest([
      this.isLogged$.pipe(startWith(false)),
      this.toggleUgcDirective$.pipe(startWith(true)),
    ]).pipe(map(([isLogged, toggleUgcDirective]) => !(isLogged && toggleUgcDirective)));
  }

  ngOnDestroy(): void {
    this.goToHomeSub$.unsubscribe();
    this.setCurrentPoiSub$.unsubscribe();
  }

  next(): void {
    this.WmMapTrackRelatedPoisDirective.poiNext();
  }

  openPopup(popup: {name: string; html: string}): void {
    this.homeCmp.popup$.next(popup);
  }

  prev(): void {
    this.WmMapTrackRelatedPoisDirective.poiPrev();
  }

  printPage(): void {
    window.print();
    let element = document.getElementById('print-page');
    element = null;
    if (element) {
      let printer = window.open('', 'PRINT', 'height=600,width=1800');
      printer.document.write('<html><head>');
      printer.document.write('<title>' + document.title + '</title>');
      printer.document.write('</head><body>');
      printer.document.write(``);
      printer.document.write('<div>' + element.innerHTML + '</div>');
      printer.document.write('</body></html>');
      printer.document.close();
      printer.focus();
      printer.print();
    }
  }

  reloadCustomTrack(): void {
    this._store.dispatch(currentCustomTrackAction({currentCustomTrack: null}));
    this.reloadCustomTracks$.next(!this.reloadCustomTracks$.value ?? false);
  }

  removeActivityFilter(activity: string): void {
    //  this.homeCmp.removeFilter(activity);
  }

  removeTrackFilter(filter: Filter): void {
    this._store.dispatch(toggleTrackFilter({filter}));
  }

  resetFilters(): void {
    this._store.dispatch(goToHome());
    // this.homeCmp.goToHome();
  }

  saveCurrentCustomTrack(track: WmFeature<LineString>): void {
    this._store.dispatch(currentCustomTrackAction({currentCustomTrack: track}));
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

  setCurrentPoi(id): void {
    this._urlHandlerSvc.updateURL({poi: id});
    this._cdr.detectChanges();
  }

  setCurrentRelatedPoi(feature: number | WmFeature<Point> | null): void {
    if (feature == null) {
      return;
    } else if (typeof feature === 'number') {
      this._urlHandlerSvc.updateURL({ec_related_poi: feature});
      this.WmMapTrackRelatedPoisDirective.setPoi = feature;
    } else if (feature.properties != null && feature.properties.id != null) {
      const id = feature.properties.id;
      this._urlHandlerSvc.updateURL({ec_related_poi: id});
    }
  }

  setLoader(event: string): void {
    switch (event) {
      case 'rendering:pois_start':
        this._store.dispatch(startLoader({identifier: 'pois'}));
        break;
      case 'rendering:layer_start':
        this._store.dispatch(startLoader({identifier: 'layer'}));
        break;
      case 'rendering:layer_done':
        this._store.dispatch(stopLoader({identifier: 'layer'}));
        break;
      case 'rendering:pois_done':
        this._store.dispatch(stopLoader({identifier: 'pois'}));
        break;
      default:
      //  this._store.dispatch(stopLoader());
    }
  }

  setPoi(poi: WmFeature<Point>): void {
    this.resetSelectedUgcPoi$.next(!this.resetSelectedUgcPoi$.value);
    const id = poi?.properties?.id ?? null;
    this._urlHandlerSvc.updateURL({poi: id ? +id : undefined});
  }

  setUgcPoi(poi: WmFeature<Point>): void {
    const id = poi?.properties?.id ?? null;
    this._urlHandlerSvc.updateURL({ugc_poi: id ? +id : undefined});
    this.resetSelectedPoi$.next(!this.resetSelectedPoi$.value);
  }

  setWmMapFeatureCollection(overlay: any): void {
    try {
      this.homeCmp.setLayer(null);
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
    combineLatest([this.authEnable$, this.isLogged$, this.drawTrackOpened$])
      .pipe(
        take(1),
        switchMap(([authEnabled, isLogged, drawTrackOpened]) => {
          if (authEnabled) {
            if (isLogged) {
              this._store.dispatch(ActiondrawTrackOpened({drawTrackOpened: !drawTrackOpened}));
              this._store.dispatch(currentCustomTrackAction({currentCustomTrack: null}));
              this._store.dispatch(setLayer(null));
              this._store.dispatch(resetPoiFilters());
              this._store.dispatch(resetTrackFilters());
              this.updateEcTrack();
              return of(null);
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
            this._store.dispatch(ActiondrawTrackOpened({drawTrackOpened: !drawTrackOpened}));
            this._store.dispatch(currentCustomTrackAction({currentCustomTrack: null}));
            return of(null);
          }
        }),
      )
      .subscribe();
  }

  unselectPOI(): void {
    this.WmMapTrackRelatedPoisDirective.setPoi = -1;
    this.resetSelectedPoi$.next(!this.resetSelectedPoi$.value);
    this.resetSelectedUgcPoi$.next(!this.resetSelectedUgcPoi$.value);
    this._urlHandlerSvc.updateURL({poi: undefined, ugc_poi: undefined, ec_related_poi: undefined});
  }

  updateEcTrack(track = undefined): void {
    this.currentLayer$
      .pipe(
        take(1),
        filter(l => l),
      )
      .subscribe(layer => {
        this.mapCmp.fitView(extentFromLonLat(layer.bbox), {duration: 1000});
      });
    this._urlHandlerSvc.updateURL({ugc_track: undefined, track});
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
    this._urlHandlerSvc.updateURL({track: undefined, ugc_track});
  }
}
