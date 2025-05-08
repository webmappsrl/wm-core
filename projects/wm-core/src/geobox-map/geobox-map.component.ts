import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {hitMapFeatureCollection, padding, leftPadding} from '@map-core/store/map-core.selector';
import {padding as actionPadding} from '@map-core/store/map-core.actions';
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
import {
  allEcpoiFeatures,
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
  wmMapHitMapChangeFeatureById,
} from '@wm-core/store/user-activity/user-activity.action';
import {
  Filter,
  IHOME,
  ILAYER,
  IOPTIONS,
  SelectFilterOption,
  SliderFilter,
} from '@wm-core/types/config';
import {BehaviorSubject, combineLatest, from, merge, of, Subject, Subscription} from 'rxjs';
import {Observable} from 'rxjs';
import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mergeAll,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {
  confJIDOUPDATETIME,
  confShowDrawTrack,
  confAUTHEnable,
} from '@wm-core/store/conf/conf.selector';
import {currentCustomTrack as currentCustomTrackAction} from '@wm-core/store/features/ugc/ugc.actions';
import {IDATALAYER} from '@map-core/types/layer';
import {
  chartHoverElements,
  drawTrackOpened,
  ecLayer,
  inputTyped,
  loading,
  mapFilters,
  poiFilterIdentifiers,
  ugcOpened,
  wmMapHitMapChangeFeatureId,
} from '@wm-core/store/user-activity/user-activity.selector';
import {WmFeature} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
import {
  currentCustomTrack,
  currentUgcPoi,
  currentUgcTrack,
  ugcPoiFeatures,
  ugcTracksFeatures,
} from '@wm-core/store/features/ugc/ugc.selector';
import {ModalController} from '@ionic/angular';
import {ProfileAuthComponent} from '@wm-core/profile/profile-auth/profile-auth.component';
import {WmMapTrackRelatedPoisDirective} from '@map-core/directives';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {WmMapComponent} from '@map-core/components';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {poi, track} from '@wm-core/store/features/features.selector';
import {FiltersComponent} from '@wm-core/filters/filters.component';
import {ActivatedRoute} from '@angular/router';
import {Actions, ofType} from '@ngrx/effects';
import {currentUgcPoiId} from '@wm-core/store/features/ugc/ugc.selector';
import {DeviceService} from '@wm-core/services/device.service';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {GeolocationService} from '@wm-core/services/geolocation.service';
import {EnvironmentService} from '@wm-core/services/environment.service';

const initPadding = [10, 10, 10, 10];
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

  @Output()
  openPopupEVT: EventEmitter<{name: string; html: string}> = new EventEmitter<{
    name: string;
    html: string;
  }>();
  @ViewChild(WmMapTrackRelatedPoisDirective)
  WmMapTrackRelatedPoisDirective: WmMapTrackRelatedPoisDirective;
  @ViewChild('filterCmp') filterCmp: FiltersComponent;
  @ViewChild(WmMapComponent) mapCmp: WmMapComponent;

  apiElasticState$: Observable<any> = this._store.select(mapFilters);
  apiSearchInputTyped$: Observable<string> = this._store.select(inputTyped);
  authEnable$: Observable<boolean> = this._store.select(confAUTHEnable);
  caretOutLine$: Observable<'caret-back-outline' | 'caret-forward-outline'>;
  centerPositionEvt$: BehaviorSubject<boolean> = new BehaviorSubject<boolean | null>(null);
  confHOME$: Observable<IHOME[]> = this._store.select(confHOME);
  confJIDOUPDATETIME$: Observable<any> = this._store.select(confJIDOUPDATETIME);
  confMap$: Observable<any> = this._store.select(confMAP);
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  currentCustomTrack$: Observable<WmFeature<LineString>> = this._store.select(currentCustomTrack);
  currentEcPoiId$ = this._store.select(currentEcPoiId);
  currentLayer$ = this._store.select(ecLayer);
  currentMapPaddings$: Observable<[number, number, number, number]>;
  currentPoi$ = this._store.select(poi);
  currentPoiNextID$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  currentPoiPrevID$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  currentPosition$: Observable<any>;
  currentRelatedPoi$ = this._store.select(currentEcRelatedPoi);
  currentRelatedPoiID$ = this._store.select(currentEcRelatedPoiId);
  currentUgcPoiIDToMap$: Observable<number | string | null>;
  dataLayerUrls$: Observable<IDATALAYER>;
  drawTrackOpened$: Observable<boolean> = this._store.select(drawTrackOpened);
  geohubId$ = this._store.select(confGeohubId);
  graphhopperHost$: Observable<string> = of(this._environmentSvc.graphhopperHost);
  isLogged$: Observable<boolean> = this._store.pipe(select(isLogged));
  isMobile$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._deviceSvc.isMobile);
  langs$ = this._store.select(confLANGUAGES).pipe(
    tap(l => {
      if (l && l.default) {
        this._langService.initLang(l.default);
      }
    }),
  );
  leftPadding$: Observable<number> = this._store.select(leftPadding);
  loading$: Observable<boolean> = this._store.select(loading);
  mapPadding$ = this._store.select(padding);
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
  resetSelectedOvelayFeatureEVT$ = new Subject<void>();
  resetSelectedPoi$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  resetSelectedUgcPoi$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  resizeEVT: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  setCurrentPoiSub$: Subscription = Subscription.EMPTY;
  showDrawTrackButton$ = this._store.select(confShowDrawTrack);
  showMenu$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(initMenuOpened);
  toggleLayerDirective$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  togglePoisDirective$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  toggleUgcDirective$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  trackElevationChartHoverElements$: Observable<WmSlopeChartHoverElements> =
    this._store.select(chartHoverElements);
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
  wmMapPositionfocus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  wmMapUgcDisableLayers$: Observable<boolean>;
  wmMapHitMapChangeFeatureById$: Observable<number> = this._store.select(
    wmMapHitMapChangeFeatureId,
  );
  constructor(
    private _route: ActivatedRoute,
    private _cdr: ChangeDetectorRef,
    private _store: Store,
    private _langService: LangService,
    private _modalCtrl: ModalController,
    private _actions$: Actions,
    private _urlHandlerSvc: UrlHandlerService,
    private _deviceSvc: DeviceService,
    private _geolocationSvc: GeolocationService,
    private _environmentSvc: EnvironmentService,
  ) {
    this.currentPosition$ = this._geolocationSvc.onLocationChange;
    this.currentMapPaddings$ = combineLatest([
      this.showMenu$,
      this.mapPadding$,
      this.leftPadding$,
    ]).pipe(
      map(([showMenu, mapPadding, leftPadding]) => {
        if (showMenu) {
          return [mapPadding[0], mapPadding[1], mapPadding[2], leftPadding];
        } else {
          return mapPadding;
        }
      }),
    );
    this.refreshLayer$ = this._actions$.pipe(ofType(updateTrackFilter, toggleTrackFilter));
    if (window.innerWidth < maxWidth) {
      this._store.dispatch(actionPadding({padding: initPadding}));
      this.resizeEVT.next(!this.resizeEVT.value);
    }
    this.dataLayerUrls$ = this.geohubId$.pipe(
      filter(g => g != null),
      map(geohubId => {
        return {
          low: this._environmentSvc.pbfUrl,
          high: this._environmentSvc.pbfUrl,
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
    this.setCurrentPoiSub$.unsubscribe();
  }

  navigation(): void {
    this._geolocationSvc.startNavigation();
    const isFocused = !this.wmMapPositionfocus$.value;
    this.wmMapPositionfocus$.next(isFocused);
  }

  next(): void {
    this.WmMapTrackRelatedPoisDirective.poiNext();
  }

  openPopup(popup: {name: string; html: string} | null): void {
    this.openPopupEVT.emit(popup);
    if (popup == null) {
      this.resetSelectedOvelayFeatureEVT$.next();
    }
  }

  updateCurrentHitmapFeatureID(id: string): void {
    this._store.dispatch(wmMapHitMapChangeFeatureById({id: +id}));
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
  }

  removeActivityFilter(activity: string): void {}

  removeTrackFilter(filter: Filter): void {
    this._store.dispatch(toggleTrackFilter({filter}));
  }

  resetFilters(): void {
    this._store.dispatch(goToHome());
  }

  saveCurrentCustomTrack(track: WmFeature<LineString>): void {
    this._store.dispatch(currentCustomTrackAction({currentCustomTrack: track}));
  }

  selectedLayer(layer: any): void {
    this._store.dispatch(setLayer(layer));
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
    const id = poi?.properties?.id ?? poi?.properties?.uuid ?? null;
    this._urlHandlerSvc.updateURL({ugc_poi: id ? id : undefined});
    this.resetSelectedPoi$.next(!this.resetSelectedPoi$.value);
  }

  setWmMapFeatureCollection(overlay: any): void {
    this._store.dispatch(setLayer(null));
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
    this._urlHandlerSvc.updateURL({track: undefined, ugc_track});
  }
}
