import {Inject, Injectable, Optional} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {from, of} from 'rxjs';
import {catchError, map, switchMap, distinctUntilChanged, tap} from 'rxjs/operators';
import {Response} from '@wm-types/elastic';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {EcService} from './ec.service';
import {
  currentEcTrackId,
  loadCurrentEcTrackFailure,
  loadCurrentEcTrackSuccess,
  loadEcPois,
  loadEcPoisFailure,
  loadEcPoisSuccess,
  ecTracks,
  ecTracksFailure,
  ecTracksSuccess,
} from '@wm-core/store/features/ec/ec.actions';
import {
  wmMapFeaturesInViewport,
  wmMapFeaturesInViewportFailure,
  wmMapFeaturesInViewportSuccess,
} from '@wm-core/store/user-activity/user-activity.action';

@Injectable({
  providedIn: 'root',
})
export class EcEffects {
  currentEcTrack$ = createEffect(() =>
    this._actions$.pipe(
      ofType(currentEcTrackId),
      switchMap(action =>
        from(this._ecSvc.getEcTrack(action.currentEcTrackId)).pipe(
          map(ecTrack => loadCurrentEcTrackSuccess({ecTrack})),
          catchError(error => of(loadCurrentEcTrackFailure({error}))),
        ),
      ),
    ),
  );
  loadEcPois$ = createEffect(() =>
    this._actions$.pipe(
      ofType(loadEcPois),
      switchMap(() =>
        this._ecSvc.getPois().pipe(
          map(featureCollection => loadEcPoisSuccess({featureCollection})),
          catchError(() => of(loadEcPoisFailure())),
        ),
      ),
    ),
  );
  queryApi$ = createEffect(() =>
    this._actions$.pipe(
      ofType(ecTracks),
      switchMap(action => {
        if (action.init) {
          return from(this._ecSvc.getQuery({})).pipe(
            map((response: Response) => ecTracksSuccess({response})),
            catchError(e => of(ecTracksFailure())),
          );
        }

        const newAction = {
          filterTracks: action.filterTracks,
          layer: action.layer,
          inputTyped: action.inputTyped,
        };
        return from(this._ecSvc.getQuery(newAction)).pipe(
          tap((response: Response) => {
            // Traccia solo le ricerche utente dalla search bar
            if (action.inputTyped && this._posthogClient) {
              this._posthogClient.capture('searchPerformed', {
                query: action.inputTyped,
                results_count: response?.hits?.length ?? 0,
              });
            }
          }),
          map((response: Response) => ecTracksSuccess({response})),
          catchError(e => of(ecTracksFailure())),
        );
      }),
    ),
  );
  featuresInViewport$ = createEffect(() =>
    this._actions$.pipe(
      ofType(wmMapFeaturesInViewport),
      distinctUntilChanged((prev, curr) => {
        const prevIds = prev.featureIds || [];
        const currIds = curr.featureIds || [];

        if (prevIds.length !== currIds.length) {
          return false;
        }
        return prevIds.every((id, index) => id === currIds[index]);
      }),
      switchMap(({featureIds}) => {
        if (featureIds.length === 0) {
          return of(null);
        }
        return this._ecSvc.getQuery({trackIds: featureIds});
      }),
      map((response) => wmMapFeaturesInViewportSuccess({featuresInViewport: response?.hits ?? []})),
      catchError(() => of(wmMapFeaturesInViewportFailure())),
    ),
  );

  constructor(
    private _ecSvc: EcService,
    private _actions$: Actions,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {}
}
