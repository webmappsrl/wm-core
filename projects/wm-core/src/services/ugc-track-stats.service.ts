import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {confGEOLOCATION} from '@wm-core/store/conf/conf.selector';
import {UgcTrackStatsParams} from '@wm-core/types/config';
import {
  UgcTrackDetails,
  resolveUgcTrackStatsParams,
  ugcTrackDetails,
} from '@wm-core/utils/ugc-track-stats';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';
import {Observable} from 'rxjs';
import {distinctUntilChanged, map, shareReplay} from 'rxjs/operators';

/**
 * Unico punto da cui l'app legge i dati tecnici delle tracce UGC e i parametri della pulizia GPS
 * (oc:8743). Il calcolo sta in `utils/ugc-track-stats.ts`.
 */
@Injectable({providedIn: 'root'})
export class UgcTrackStatsService {
  /** Parametri da `config.json` → `GEOLOCATION.record.stats`, con i default se mancano. */
  readonly params$: Observable<UgcTrackStatsParams> = this._store.select(confGEOLOCATION).pipe(
    map(geolocation => resolveUgcTrackStatsParams(geolocation?.record?.stats)),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  constructor(private _store: Store) {}

  /**
   * Dati tecnici di una traccia: `stats` del server o calcolo locale.
   *
   * @param track la traccia
   * @returns i valori da mostrare
   */
  details$(track: WmFeature<LineString>): Observable<UgcTrackDetails> {
    return this.params$.pipe(map(params => ugcTrackDetails(track, params)));
  }
}
