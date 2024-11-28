import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, of} from 'rxjs';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {
  inputTyped,
  loadPois,
  loadPoisFail,
  loadPoisSuccess,
  loadUgcPois,
  loadUgcPoisFail,
  loadUgcPoisSuccess,
  query,
  queryApiFail,
  queryApiSuccess,
  removeTrackFilters,
  setLayer,
  setUgc,
  toggleTrackFilterByIdentifier,
} from './api.actions';
import {ApiService} from './api.service';
import {ApiRootState} from './api.reducer';
import {Store} from '@ngrx/store';
import {apiTrackFilterIdentifier} from './api.selector';
import {Filter} from '../../types/config';
import {IHIT, IRESPONSE} from '@wm-core/types/elastic';
import {getUgcPois, getUgcTracks} from '@wm-core/utils/localForage';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {syncUgcSuccess} from '../auth/auth.actions';

@Injectable({
  providedIn: 'root',
})
export class ApiEffects {
  addFilterTrackApi$ = createEffect(() =>
    this._store.select(apiTrackFilterIdentifier).pipe(
      withLatestFrom(this._store),
      switchMap(([trackFilterIdentifier, state]) => {
        const api = state['query'];
        return of({
          type: '[api] Query',
          ...{filterTracks: trackFilterIdentifier},
          ...{layer: api.layer},
          ...{inputTyped: api.inputTyped},
        });
      }),
    ),
  );
  inputTypedApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(inputTyped),
      switchMap(_ => {
        return of({
          type: '[api] Query',
        });
      }),
    ),
  );
  loadPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadPois),
      switchMap(() =>
        this._apiSVC.getPois().pipe(
          map(featureCollection => loadPoisSuccess({featureCollection})),
          catchError(() => of(loadPoisFail())),
        ),
      ),
    ),
  );
  loadUgcPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(syncUgcSuccess),
      switchMap(() =>
        from(getUgcPois()).pipe(
          map(featureCollection => loadUgcPoisSuccess({featureCollection})),
          catchError(() => of(loadUgcPoisFail())),
        ),
      ),
    ),
  );
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(query),
      withLatestFrom(this._store),
      switchMap(([action, state]) => {
        const api = state['query'];
        if (action.init) {
          return from(this._apiSVC.getQuery({})).pipe(
            map((response: IRESPONSE) => queryApiSuccess({response})),
            catchError(e => of(queryApiFail())),
          );
        }
        if (api.filterTracks.length === 0 && api.layer == null && api.inputTyped == null) {
          return of(queryApiFail());
        }
        const newAction = {
          ...action,
          ...{filterTracks: api.filterTracks},
          ...{layer: api.layer},
          ...{inputTyped: api.inputTyped},
        };
        return from(this._apiSVC.getQuery(newAction)).pipe(
          map((response: IRESPONSE) => queryApiSuccess({response})),
          catchError(e => of(queryApiFail())),
        );
      }),
    ),
  );
  removeTrackFiltersApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(removeTrackFilters),
      switchMap(_ => {
        return of({
          type: '[api] Query',
        });
      }),
    ),
  );
  setLayerApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setLayer),
      switchMap(_ => {
        return of({
          type: '[api] Query',
        });
      }),
    ),
  );
  setUgc$ = createEffect(() =>
    this._actions$.pipe(
      ofType(setUgc),
      switchMap(_ =>
        from(getUgcTracks()).pipe(
          map(ugcTracks => {
            const hits = this._WmFeatureToHits(ugcTracks);
            const response: IRESPONSE = {
              aggregations: {},
              hits,
            };
            return queryApiSuccess({response});
          }),
          catchError(_ => {
            return of(queryApiFail());
          }),
        ),
      ),
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
          return of({
            type: '[api] toggle track filter',
            filter: {...filter[0], taxonomy: action.taxonomy},
          });
        }
      }),
    ),
  );

  constructor(
    private _apiSVC: ApiService,
    private _actions$: Actions,
    private _store: Store<ApiRootState>,
  ) {}

  private _WmFeatureToHits(tracks: WmFeature<LineString>[]): IHIT[] {
    const hits: IHIT[] = [];

    tracks.forEach(track => {
      const activity = track.properties?.form?.activity;
      const hit: IHIT = {
        id: `ugc_${track.properties.id ?? track.properties.uuid}`,
        taxonomyActivities: activity ? [activity] : [],
        taxonomyWheres: [],
        cai_scale: '',
        distance: '',
        feature_image: null,
        layers: [],
        name: track.properties.name,
        properties: {},
        ref: '',
      };

      hits.push(hit);
    });

    return hits;
  }
}
