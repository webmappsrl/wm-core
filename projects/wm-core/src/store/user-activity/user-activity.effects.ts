import {
  applyWhere,
  backOfMapDetails,
  closeUgc,
  goToHome,
  inputTyped,
  openUgcUploader,
  resetPoiFilters,
  setLayer,
  setMapDetailsStatus,
  toggleTrackFilter,
  toggleTrackFilterByIdentifier,
  updateTrackFilter,
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
import {
  removeTrackFilters,
  resetTrackFilters,
  setLoading,
} from '@wm-core/store/user-activity/user-activity.action';
import {
  ecLayer,
  filterTracks,
  inputTyped as inputTypedSelector,
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
} from 'rxjs/operators';
import {combineLatest, of} from 'rxjs';
import {Filter} from '@wm-core/types/config';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {ModalController} from '@ionic/angular';
import {ModalUgcTrackUploaderComponent} from '@wm-core/modal-ugc-track-uploader/modal-ugc-track-uploader.component';
import {EcService} from '@wm-core/store/features/ec/ec.service';

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
        this._urlHandlerSvc.resetURL();
        return setMapDetailsStatus({status: 'background'});
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
            component: ModalUgcTrackUploaderComponent,
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

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    private _modalCtrl: ModalController,
  ) {}
}
