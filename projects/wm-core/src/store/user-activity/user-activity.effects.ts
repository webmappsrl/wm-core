import {
  applyWhere,
  backOfMapDetails,
  closeUgc,
  drawPoiOpened,
  drawTrackOpened,
  goToHome,
  inputTyped,
  loadHitmapFeatures,
  loadHitmapFeaturesFail,
  loadHitmapFeaturesSuccess,
  openDownloads,
  openLoginModal,
  openUgcUploader,
  resetPoiFilters,
  setLayer,
  setMapDetailsStatus,
  startDrawUgcPoi,
  stopDrawUgcPoi,
  toggleTrackFilter,
  toggleTrackFilterByIdentifier,
  updateTrackFilter,
  setHomeResultTabSelected,
  getDirections,
  startGetDirections,
  setFocusPosition,
  setOnRecord,
  checkCurrentUgcTrack,
  resumeCurrentUgcTrack,
  setEnableTrackRecorderPanel,
  setCurrentUgcTrackRecording,
} from './user-activity.action';
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {
  ecTracksSuccess,
  ecTracksFailure,
  ecTracks,
  currentEcLayerId,
} from '@wm-core/store/features/ec/ec.actions';
import {resetTrackFilters, setLoading} from '@wm-core/store/user-activity/user-activity.action';
import {
  ecLayer,
  filterTracks,
  inputTyped as inputTypedSelector,
  lastFilterType,
} from '@wm-core/store/user-activity/user-activity.selector';
import {
  debounceTime,
  map,
  mergeMap,
  skip,
  switchMap,
  tap,
  withLatestFrom,
  filter,
  startWith,
  catchError,
  concatMap,
  delay,
} from 'rxjs/operators';
import {combineLatest, EMPTY, from, of} from 'rxjs';
import {Filter} from '@wm-core/types/config';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {AlertController, ModalController} from '@ionic/angular';
import {ModalUgcUploaderComponent} from '@wm-core/modal-ugc-uploader/modal-ugc-uploader.component';
import {HttpClient} from '@angular/common/http';
import {WmFeature, WmFeatureCollection} from '@wm-types/feature';
import {MultiPolygon} from 'geojson';
import {setCurrentUgcPoiDrawn, setCurrentUgcPoiDrawnSuccess} from '../features/ugc/ugc.actions';
import {
  countTracks,
  poiFirstCoordinates,
  trackFirstCoordinates,
  trackNearestCoordinates,
} from '@wm-core/store/features/features.selector';
import {ModalGetDirectionsComponent} from '@wm-core/modal-get-directions/modal-get-directions.component';
import {ProfileAuthComponent} from '@wm-core/profile/profile-auth/profile-auth.component';
import {currentCustomTrack} from '@wm-core/store/features/ugc/ugc.actions';
import {confAUTHEnable} from '../conf/conf.selector';
import {isLogged} from '../auth/auth.selectors';
import {
  getCurrentUgcTrack,
  getCurrentUgcTrackTime,
  removeCurrentUgcTrack,
  saveCurrentUgcTrack,
} from '@wm-core/utils/localForage';
import {GeolocationService} from '@wm-core/services/geolocation.service';
import {LangService} from '@wm-core/localization/lang.service';

@Injectable()
export class UserActivityEffects {
  backOfMapDetails$ = createEffect(() =>
    this._actions$.pipe(
      ofType(backOfMapDetails),
      map(() => {
        const removeLatest = this._urlHandlerSvc.removeLatest();
        if (removeLatest) {
          return setMapDetailsStatus({status: 'background'});
        } else {
          return;
        }
      }),
      filter(action => !!action),
    ),
  );

  goToHome$ = createEffect(() =>
    this._actions$.pipe(
      ofType(goToHome),
      mergeMap(() =>
        of(
          inputTyped({inputTyped: ''}),
          setLayer(null),
          resetTrackFilters(),
          resetPoiFilters(),
          closeUgc(),
          setMapDetailsStatus({status: 'background'}),
        ),
      ),
      tap(() => this._urlHandlerSvc.resetURL()),
    ),
  );
  openUgcUploader$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(openUgcUploader),
        switchMap(() =>
          this._modalCtrl.create({
            component: ModalUgcUploaderComponent,
          }),
        ),
        switchMap(modal => modal.present()),
      ),
    {dispatch: false},
  );

  setECLayerId$ = createEffect(() => this._actions$.pipe(ofType(currentEcLayerId)), {
    dispatch: false,
  });
  setLoadingStart$ = createEffect(() =>
    this._actions$.pipe(
      ofType(resetTrackFilters, setLayer, toggleTrackFilter, updateTrackFilter, applyWhere),
      map(() => setLoading({loading: true})),
    ),
  );
  setLoadingStopFail$ = createEffect(() =>
    this._actions$.pipe(
      ofType(ecTracksFailure),
      map(() => setLoading({loading: false})),
    ),
  );
  setLoadingStopSuccess$ = createEffect(() =>
    this._actions$.pipe(
      ofType(ecTracksSuccess),
      map(() => setLoading({loading: false})),
    ),
  );
  toggleTrackFilterByIdentifier$ = createEffect(() =>
    this._actions$.pipe(
      ofType(toggleTrackFilterByIdentifier),
      withLatestFrom(this._store),
      //@ts-ignore
      switchMap(([action, state]) => {
        let filters: Filter[] = [];
        try {
          filters = state['conf']['MAP'].filters[action.taxonomy].options;
        } catch (_) {}
        let filter = filters.filter(f => f.identifier === action.identifier);
        if (filter.length > 0) {
          return of(toggleTrackFilter({filter: {...filter[0], taxonomy: action.taxonomy}}));
        }
      }),
    ),
  );
  triggerQueryOnInput$ = createEffect(() =>
    combineLatest([
      this._store.select(inputTypedSelector).pipe(debounceTime(300), startWith('')),
      this._store.select(filterTracks),
      this._store.select(ecLayer),
    ]).pipe(
      map(([inputTyped, filterTracks, layer]) => ({
        inputTyped: inputTyped?.trim(),
        filterTracks,
        layer,
      })),
      switchMap(({inputTyped, filterTracks, layer}) => {
        let query = {init: false};
        if (inputTyped != null && inputTyped !== '') {
          query = {...query, ...{inputTyped}};
        }
        if (filterTracks != null && filterTracks.length > 0) {
          query = {...query, ...{filterTracks}};
        }
        query = {...query, ...{layer}};
        return [ecTracks(query)];
      }),
    ),
  );

  loadHitmap$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadHitmapFeatures),
      switchMap(action =>
        this._http.get(action.url).pipe(
          filter(hitmapFeatures => hitmapFeatures != null),
          map((hitmapFeatureCollection: WmFeatureCollection) => {
            const wmMapHitmapFeatures =
              hitmapFeatureCollection.features as WmFeature<MultiPolygon>[];
            return loadHitmapFeaturesSuccess({wmMapHitmapFeatures});
          }),
          catchError((_: any) => of(loadHitmapFeaturesFail())),
        ),
      ),
    ),
  );

  drawTrackOpened$ = createEffect(() =>
    this._actions$.pipe(
      ofType(drawTrackOpened),
      withLatestFrom(this._store.select(confAUTHEnable), this._store.select(isLogged)),
      mergeMap(([_, authEnabled, isLogged]) => {
        if (authEnabled && !isLogged) {
          return [openLoginModal()];
        } else {
          return [
            currentCustomTrack({currentCustomTrack: null}),
            setLayer(null),
            resetPoiFilters(),
            resetTrackFilters(),
          ];
        }
      }),
    ),
  );

  startDrawUgcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(startDrawUgcPoi),
      withLatestFrom(this._store.select(confAUTHEnable), this._store.select(isLogged)),
      mergeMap(([{ugcPoi}, authEnabled, isLogged]) => {
        if (authEnabled && !isLogged) {
          return [openLoginModal()];
        } else {
          return [
            setCurrentUgcPoiDrawn({currentUgcPoiDrawn: ugcPoi}),
            drawPoiOpened({drawPoiOpened: true}),
            ...(ugcPoi === null ? [setLayer(null), resetPoiFilters(), resetTrackFilters()] : []),
          ];
        }
      }),
    ),
  );

  stopDrawUgcPoi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(stopDrawUgcPoi),
      mergeMap(() => [
        setCurrentUgcPoiDrawnSuccess({currentUgcPoiDrawn: null}),
        drawPoiOpened({drawPoiOpened: false}),
      ]),
    ),
  );

  setCurrentUgcTrackRecording$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setCurrentUgcTrackRecording),
        map(({currentUgcTrackRecording, recordTime}) => {
          if (currentUgcTrackRecording && recordTime) {
            saveCurrentUgcTrack(currentUgcTrackRecording, recordTime);
          }
          return of(null);
        }),
      ),
    {dispatch: false},
  );

  //TODO: refactor, gestire in un unico effect la logica dell'homeResultTabSelected
  setHomeResultTabWhenLastFilterTypeChanged$ = createEffect(() =>
    this._store.select(lastFilterType).pipe(
      filter(lastFilterType => lastFilterType != null),
      map(lastFilterType => setHomeResultTabSelected({tab: lastFilterType})),
    ),
  );

  setHomeResultTabWhenTracksCountIsZero$ = createEffect(() =>
    this._store.select(countTracks).pipe(
      skip(1), // Utilizzato per evitare di tener conto del primo valore emesso da countTracks che sarà sempre 0 all'avvio dell'app
      filter(trackCount => trackCount === 0),
      map(() => setHomeResultTabSelected({tab: 'pois'})),
    ),
  );

  setHomeResultTabToTracksWhenOpenDownloads$ = createEffect(() =>
    this._actions$.pipe(
      ofType(openDownloads),
      map(() => setHomeResultTabSelected({tab: 'tracks'})),
    ),
  );

  startGetDirections$ = createEffect(() =>
    this._actions$.pipe(
      ofType(startGetDirections),
      withLatestFrom(
        this._store.select(poiFirstCoordinates),
        this._store.select(trackFirstCoordinates),
        this._store.select(trackNearestCoordinates),
      ),
      switchMap(([_, poiFirstCoords, trackStartCoords, trackNearestCoords]) => {
        if (poiFirstCoords) {
          return of(getDirections({coordinates: poiFirstCoords}));
        }

        return from(
          this._modalCtrl.create({
            component: ModalGetDirectionsComponent,
            initialBreakpoint: 0.25,
            breakpoints: [0, 0.25],
          }),
        ).pipe(
          switchMap(modal =>
            from(modal.present()).pipe(switchMap(() => from(modal.onDidDismiss()))),
          ),
          map(result => result.data),
          switchMap(type => {
            switch (type) {
              case 'start':
                return of(getDirections({coordinates: trackStartCoords}));
              case 'nearest':
                return of(getDirections({coordinates: trackNearestCoords}));
              default:
                return of(null);
            }
          }),
        );
      }),
    ),
  );

  getDirections$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(getDirections),
        map(({coordinates}) => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}`;
          window.open(url, '_blank');
        }),
      ),
    {dispatch: false},
  );

  openLoginModal$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(openLoginModal),
        mergeMap(() =>
          from(
            this._modalCtrl.create({
              component: ProfileAuthComponent,
              componentProps: {
                slide1: 'assets/images/profile/logged_out_slide_1.svg',
                slide2: 'assets/images/profile/logged_out_slide_2.svg',
              },
              id: 'wm-profile-auth-modal',
            }),
          ).pipe(concatMap(modal => from(modal.present()))),
        ),
      ),
    {dispatch: false},
  );

  setOnRecord$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setOnRecord),
      map(({onRecord}) => setFocusPosition({focusPosition: onRecord})),
    ),
  );

  checkCurrentUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(checkCurrentUgcTrack),
      switchMap(() => this._geolocationSvc.hasCurrentUgcTrack$),
      filter(hasCurrentUgcTrack => hasCurrentUgcTrack === true),
      switchMap(hasCurrentUgcTrack => {
        if (hasCurrentUgcTrack) {
          return from(
            this._alertCtrl.create({
              message: this._langSvc.instant(
                'È stata rilevata una registrazione interrotta. Vuoi riprenderla?',
              ),
              buttons: [
                {
                  text: this._langSvc.instant('Annulla'),
                  role: 'cancel',
                },
                {
                  text: this._langSvc.instant('Riprendi'),
                  role: 'confirm',
                },
              ],
            }),
          ).pipe(
            concatMap(alert => from(alert.present()).pipe(map(() => alert))),
            concatMap(alert => from(alert.onDidDismiss())),
            map(result => resumeCurrentUgcTrack({resume: result.role === 'confirm'})),
          );
        }
        return of(resumeCurrentUgcTrack({resume: false}));
      }),
    ),
  );

  resumeCurrentUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(resumeCurrentUgcTrack),
      switchMap(({resume}) => {
        if (!resume) {
          removeCurrentUgcTrack();
          return EMPTY;
        }

        // Recupera sia la traccia che il tempo salvati
        return from(this._geolocationSvc.resumeRecordingFromSaved()).pipe(
          mergeMap(() => {
            this._urlHandlerSvc.changeURL('map');

            return [setEnableTrackRecorderPanel({enable: true})];
          }),
        );
      }),
    ),
  );

  setEnableTrackRecorderPanel$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setEnableTrackRecorderPanel),
      switchMap(({enable, currentUgcTrackRecording}) => {
        if (enable && currentUgcTrackRecording) {
          return of(setCurrentUgcTrackRecording({currentUgcTrackRecording}));
        } else if (!enable) {
          return of(setCurrentUgcTrackRecording({currentUgcTrackRecording: null}));
        } else {
          return EMPTY;
        }
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    private _modalCtrl: ModalController,
    private _alertCtrl: AlertController,
    private _http: HttpClient,
    private _geolocationSvc: GeolocationService,
    private _langSvc: LangService,
  ) {}
}
