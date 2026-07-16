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
  getDirections,
  startGetDirections,
  setFocusPosition,
  setOnRecord,
  checkCurrentUgcTrack,
  resumeCurrentUgcTrack,
  setEnableTrackRecorderPanel,
  setTrackRemainingDistance,
  resetTrackRemainingDistance,
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
import {currentEcTrack} from '@wm-core/store/features/ec/ec.selector';
import {resetTrackFilters, setLoading} from '@wm-core/store/user-activity/user-activity.action';
import {
  ecLayer,
  filterTracks,
  inputTyped as inputTypedSelector,
  trackProgress as trackProgressSelector,
} from '@wm-core/store/user-activity/user-activity.selector';
import {
  debounceTime,
  delay,
  ignoreElements,
  map,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
  filter,
  startWith,
  catchError,
  concatMap,
} from 'rxjs/operators';
import {combineLatest, EMPTY, from, of} from 'rxjs';
import {Filter} from '@wm-core/types/config';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {AlertController, ModalController} from '@ionic/angular';
import {ModalUgcUploaderComponent} from '@wm-core/modal-ugc-uploader/modal-ugc-uploader.component';
import {HttpClient} from '@angular/common/http';
import {WmFeature, WmFeatureCollection} from '@wm-types/feature';
import {MultiPolygon} from 'geojson';
import {
  setCurrentUgcPoiDrawn,
  setCurrentUgcPoiDrawnSuccess,
  enableSyncInterval,
  disableSyncInterval,
} from '../features/ugc/ugc.actions';
import {
  poiFirstCoordinates,
  track,
  trackFirstCoordinates,
} from '@wm-core/store/features/features.selector';
import {getClosestPoint} from '@map-core/utils/geometry';
import {ModalGetDirectionsComponent} from '@wm-core/modal-get-directions/modal-get-directions.component';
import {ProfileAuthComponent} from '@wm-core/profile/profile-auth/profile-auth.component';
import {currentCustomTrack} from '@wm-core/store/features/ugc/ugc.actions';
import {confAUTHEnable} from '../conf/conf.selector';
import {isLogged} from '../auth/auth.selectors';
import {GeolocationService} from '@wm-core/services/geolocation.service';
import {GeoutilsService, RemainingDistanceContext} from '@wm-core/services/geoutils.service';
import {LangService} from '@wm-core/localization/lang.service';
import {removeCurrentUgcTrackLocations} from '@wm-core/utils/localForage';
import {TRACK_POSITION_STALE_THRESHOLD_MS} from '@wm-core/constants/track-remaining-distance';

@Injectable()
export class UserActivityEffects {
  // coordinate riproiettate in 3857 + distanze cumulative, precalcolate una sola volta per
  // traccia (non ad ogni fix GPS) via GeoutilsService.prepareRemainingDistanceContext (oc:8177)
  private _currentTrackContext: {id: number; context: RemainingDistanceContext} | null = null;
  private _lastLocationTime: number | null = null;
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

  checkCurrentUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(checkCurrentUgcTrack),
      switchMap(() => this._geolocationSvc.hasCurrentUgcTrack$),
      filter(hasCurrentUgcTrack => hasCurrentUgcTrack === true),
      tap(() => this._urlHandlerSvc.changeURL('map')),
      delay(200),
      switchMap(_ => {
        this._geolocationSvc.resumeRecordingFromSaved();
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
          switchMap(result => {
            if (result.role === 'confirm') {
              return of(resumeCurrentUgcTrack({resume: true}));
            }
            // Se ha cliccato su "Annulla", mostra popup di conferma
            return from(
              this._alertCtrl.create({
                message: this._langSvc.instant(
                  'Sei sicuro di voler annullare? Questa operazione comporterà la perdita dei dati della registrazione.',
                ),
                buttons: [
                  {
                    text: this._langSvc.instant('Recupera'),
                    role: 'resume',
                  },
                  {
                    text: this._langSvc.instant('Cancella'),
                    role: 'cancel',
                  },
                ],
              }),
            ).pipe(
              concatMap(confirmAlert => from(confirmAlert.present()).pipe(map(() => confirmAlert))),
              concatMap(confirmAlert => from(confirmAlert.onDidDismiss())),
              map(confirmResult =>
                resumeCurrentUgcTrack({resume: confirmResult.role === 'resume'}),
              ),
            );
          }),
        );
      }),
    ),
  );

  resumeCurrentUgcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(resumeCurrentUgcTrack),
      switchMap(({resume}) => {
        if (!resume) {
          this._geolocationSvc.stopRecording();
          removeCurrentUgcTrackLocations();
          return EMPTY;
        }

        return of(setEnableTrackRecorderPanel({enable: true}));
      }),
    ),
  );

  startGetDirections$ = createEffect(() =>
    this._actions$.pipe(
      ofType(startGetDirections),
      withLatestFrom(
        this._store.select(poiFirstCoordinates),
        this._store.select(trackFirstCoordinates),
        this._store.select(track),
        this._geolocationSvc.onLocationChange$,
      ),
      switchMap(([_, poiFirstCoords, trackStartCoords, currentTrack, currentLocation]) => {
        if (poiFirstCoords) {
          return of(getDirections({coordinates: poiFirstCoords}));
        }

        // Calcola il punto più vicino sulla traccia rispetto alla posizione corrente
        const trackNearestCoords =
          currentTrack && currentLocation
            ? getClosestPoint(currentTrack, [currentLocation.longitude, currentLocation.latitude])
            : null;

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
      mergeMap(({onRecord}) => [
        setFocusPosition({focusPosition: onRecord}),
        onRecord ? disableSyncInterval() : enableSyncInterval(),
      ]),
    ),
  );

  // Combina la posizione GPS live con la traccia correntemente aperta per calcolare
  // distanza rimanente/avanzamento (oc:8177). Al cambio traccia, il contesto (riproiezione +
  // distanze cumulative) viene ricostruito PRIMA di calcolare — mai con la geometria della
  // traccia precedente — ma il calcolo avviene comunque nella stessa emissione, usando la
  // posizione GPS già disponibile (onLocationChange$ è un ReplaySubject: se l'utente è fermo
  // all'apertura della traccia, l'ultima posizione nota resta valida e va usata subito, non
  // solo al prossimo fix).
  trackRemainingDistance$ = createEffect(() =>
    combineLatest([this._geolocationSvc.onLocationChange$, this._store.select(currentEcTrack)]).pipe(
      withLatestFrom(this._store.select(trackProgressSelector)),
      map(([[location, ecTrack], lastKnownProgress]) => {
        const trackId = ecTrack?.properties?.id ?? null;

        if (trackId == null || ecTrack.geometry == null) {
          this._currentTrackContext = null;
          this._lastLocationTime = null;
          return resetTrackRemainingDistance();
        }

        const isNewTrack = this._currentTrackContext?.id !== trackId;
        if (isNewTrack) {
          const context = this._geoutilsSvc.prepareRemainingDistanceContext(ecTrack.geometry);
          this._currentTrackContext = context != null ? {id: trackId, context} : null;
          this._lastLocationTime = null;
        }

        if (this._currentTrackContext == null) {
          return resetTrackRemainingDistance();
        }

        const elapsedSeconds =
          this._lastLocationTime != null ? (location.time - this._lastLocationTime) / 1000 : null;
        this._lastLocationTime = location.time;

        const result = this._geoutilsSvc.getRemainingDistance(
          location,
          this._currentTrackContext.context,
          // Al cambio traccia lastKnownProgress apparterrebbe alla traccia precedente:
          // forzare la ricerca globale invece di vincolarla a una finestra locale sbagliata.
          isNewTrack ? null : lastKnownProgress,
          elapsedSeconds,
        );

        return setTrackRemainingDistance({
          remainingDistance: result?.remainingDistance ?? null,
          distanceCovered: result?.distanceCovered ?? null,
          trackProgress: result?.trackProgress ?? null,
          trackPositionStale:
            result != null && Date.now() - location.time > TRACK_POSITION_STALE_THRESHOLD_MS,
        });
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    private _modalCtrl: ModalController,
    private _http: HttpClient,
    private _geolocationSvc: GeolocationService,
    private _geoutilsSvc: GeoutilsService,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
  ) {}
}
