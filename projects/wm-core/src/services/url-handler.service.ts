import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {
  currentEcImageGalleryIndex,
  currentEcLayerId,
  currentEcPoiId,
  currentEcRelatedPoiId,
  currentEcTrackId,
} from '@wm-core/store/features/ec/ec.actions';
import {currentUgcPoiId, currentUgcTrackId} from '@wm-core/store/features/ugc/ugc.actions';
import {Params} from '@angular/router';
import {debounceTime, skip, take} from 'rxjs/operators';
import {closeDownloads, closeUgc, openUgc} from '@wm-core/store/user-activity/user-activity.action';
import {BehaviorSubject} from 'rxjs';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';

@Injectable({
  providedIn: 'root',
})
export class UrlHandlerService {
  private _currentQueryParams$: BehaviorSubject<Params> = new BehaviorSubject<Params>({});
  private _emptyParams: Params = {
    track: undefined,
    poi: undefined,
    ugc_track: undefined,
    ugc_poi: undefined,
    slug: undefined,
    layer: undefined,
    filter: undefined,
    gallery_index: undefined,
  };

  private _ugcOpened$ = this._store.select(ugcOpened);

  constructor(private _route: ActivatedRoute, private _router: Router, private _store: Store) {
    this.initialize();
  }

  changeURL(route, queryParams: Params = this.getCurrentQueryParams()): void {
    if (route != null) {
      setTimeout(() => {
        this.navigateTo([route], queryParams);
      }, 0);
    }
  }

  getCurrentPath(): string {
    return this._router.url.split('?')[0].replace('/', '');
  }

  /**
   * Get the current query params from the URL.
   * @returns Params - The query parameters as an object.
   */
  getCurrentQueryParams(): Params {
    return this._currentQueryParams$.value;
  }

  initialize(): void {
    this._route.queryParams.pipe(skip(1), debounceTime(100)).subscribe(params => {
      this._store.dispatch(currentEcLayerId({currentEcLayerId: params.layer ?? null}));
      this._store.dispatch(currentEcTrackId({currentEcTrackId: params.track ?? null}));
      this._store.dispatch(currentEcPoiId({currentEcPoiId: params.poi ?? null}));
      this._store.dispatch(
        currentEcRelatedPoiId({currentRelatedPoiId: params.ec_related_poi ?? null}),
      );
      this._store.dispatch(currentUgcTrackId({currentUgcTrackId: params.ugc_track ?? null}));
      this._store.dispatch(currentUgcPoiId({currentUgcPoiId: params.ugc_poi ?? null}));
      this._store.dispatch(
        currentEcImageGalleryIndex({
          currentEcImageGalleryIndex: params.gallery_index ? +params.gallery_index : null,
        }),
      );
      this._checkIfUgcIsOpened(params);
      this._currentQueryParams$.next(params);
    });
  }

  navigateTo(routes: string[] = [], queryParams: Params = this._emptyParams): void {
    this._currentQueryParams$.next(queryParams);
    this._router.navigate(routes, {
      relativeTo: this._route,
      queryParams,
      queryParamsHandling: '',
    });
  }

  /**
   * Reset the URL query params to exactly match the provided value.
   * Perform navigation only if query params differ.
   */
  resetURL(): void {
    this._store.dispatch(closeUgc());
    this._store.dispatch(closeDownloads());
    this.navigateTo();
  }

  /**
   * Merge new query params with the existing ones and update the URL.
   * Perform navigation only if query params differ.
   */
  updateURL(queryParams: Params, routes = []): void {
    const excluseField = ['track', 'poi', 'ugc_track', 'ugc_poi'];
    const oldParams = {...this._emptyParams, ...this.getCurrentQueryParams()};
    const newParams = {...oldParams, ...queryParams};

    for (let i = 0; i < excluseField.length; i++) {
      const field = excluseField[i];
      if (queryParams[field] != null) {
        const fieldsToRemove = excluseField.filter(f => f != field);
        fieldsToRemove.forEach(fieldsToRemove => {
          newParams[fieldsToRemove] = undefined;
        });
      }
    }
    if (JSON.stringify(newParams) !== JSON.stringify(oldParams)) {
      this._checkIfUgcIsOpened(newParams);
      this.navigateTo(routes, newParams);
    }
  }

  setPoi(id: string | number): void {
    this._ugcOpened$.pipe(take(1)).subscribe(ugcOpened => {
      const queryParams = ugcOpened
        ? {ugc_poi: id ? id : undefined, poi: undefined}
        : {poi: id ? id : undefined, ugc_poi: undefined};
      this.updateURL(queryParams, ['map']);
    });
  }

  setTrack(id: string | number): void {
    this._ugcOpened$.pipe(take(1)).subscribe(ugcOpened => {
      const queryParams = ugcOpened
        ? {ugc_track: id ? id : undefined}
        : {track: id ? id : undefined};
      this.updateURL(queryParams, ['map']);
    });
  }

  private _checkIfUgcIsOpened(queryParams: Params): void {
    if (queryParams.track != null || queryParams.poi != null) {
      this._store.dispatch(closeUgc());
      this._store.dispatch(closeDownloads());
    }
    if (queryParams.ugc_track != null || queryParams.ugc_poi != null) {
      this._store.dispatch(openUgc());
    }
  }
  removeLatest(): boolean {
    const queryParams = this.getCurrentQueryParams();
    if (queryParams.gallery_index != null) {
      this.updateURL({gallery_index: undefined});
      return false;
    } else if (queryParams.ec_related_poi != null) {
      this.updateURL({ec_related_poi: undefined});
      return false;
    } else if (queryParams.layer != null && (queryParams.poi != null || queryParams.track != null)) {
      this.updateURL({poi: undefined, track: undefined});
      return false;
    } else if (queryParams.ugc_track != null || queryParams.ugc_poi != null) {
      this.updateURL({ugc_track: undefined, ugc_poi: undefined});
      return false;
    } else {
      this.resetURL();
      return true;
    }
  }
}
