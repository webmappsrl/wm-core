import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {
  currentEcLayerId,
  currentEcPoiId,
  currentEcRelatedPoiId,
  currentEcTrackId,
} from '@wm-core/store/features/ec/ec.actions';
import {currentUgcPoiId, currentUgcTrackId} from '@wm-core/store/features/ugc/ugc.actions';
import {Params} from '@angular/router';
import {debounceTime, skip} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UrlHandlerService {
  private _baseParams: Params = {
    track: undefined,
    poi: undefined,
    ugc_track: undefined,
    ugc_poi: undefined,
    slug: undefined,
    layer: undefined,
    filter: undefined,
  };

  constructor(private _route: ActivatedRoute, private _router: Router, private _store: Store) {}

  initialize(): void {
    this._route.queryParams.pipe(skip(1), debounceTime(500)).subscribe(params => {
      this._store.dispatch(currentEcLayerId({currentEcLayerId: params.layer ?? null}));
      this._store.dispatch(currentEcTrackId({currentEcTrackId: params.track ?? null}));
      this._store.dispatch(currentEcPoiId({currentEcPoiId: params.poi ?? null}));
      this._store.dispatch(
        currentEcRelatedPoiId({currentRelatedPoiId: params.ec_related_poi ?? null}),
      );
      this._store.dispatch(currentUgcTrackId({currentUgcTrackId: params.ugc_track ?? null}));
      this._store.dispatch(currentUgcPoiId({currentUgcPoiId: params.ugc_poi ?? null}));
    });
  }

  /**
   * Reset the URL query params to exactly match the provided value.
   * Perform navigation only if query params differ.
   */
  resetURL(queryParams: Params | null): void {
    const currentParams = this._route.snapshot.queryParams;

    if (queryParams === null) {
      if (Object.keys(currentParams).length > 0) {
        this._router.navigate([], {
          relativeTo: this._route,
          queryParams: {}, // Reset query params
          queryParamsHandling: '', // Clear all query params
        });
      }
    } else if (JSON.stringify(queryParams) !== JSON.stringify(currentParams)) {
      // Only navigate if query params are different
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams, // Exact query params passed
        queryParamsHandling: '', // Overwrite completely
      });
    }
  }

  /**
   * Merge new query params with the existing ones and update the URL.
   * Perform navigation only if query params differ.
   */
  updateURL(queryParams: Params): void {
    const oldParams = this._route.snapshot.queryParams;
    const newParams = {...this._baseParams, ...oldParams, ...queryParams};

    if (JSON.stringify(newParams) !== JSON.stringify(oldParams)) {
      // Only navigate if new params differ from old ones
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams: newParams,
        queryParamsHandling: 'merge',
      });
    }
  }
}
