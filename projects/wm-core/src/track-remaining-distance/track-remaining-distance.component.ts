import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {confOPTIONSShowTrackRemainingDistance} from '@wm-core/store/conf/conf.selector';
import {
  trackPositionStale,
  trackProgress,
  trackRemainingDistance,
} from '@wm-core/store/user-activity/user-activity.selector';

export interface ITrackRemainingDistanceVm {
  remainingDistance: number;
  stale: boolean;
  progressPercent: number | null;
}

@Component({
  standalone: false,
  selector: 'wm-track-remaining-distance',
  templateUrl: './track-remaining-distance.component.html',
  styleUrls: ['./track-remaining-distance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTrackRemainingDistanceComponent {
  // Gate su OPTIONS.showTrackRemainingDistance (default true finché non si decide il rollout
  // definitivo, vedi conf.reducer.ts) — solo questo componente è dietro il flag, il marker sul
  // grafico altimetrico resta sempre attivo (oc:8177).
  //
  // La visibilità è sull'intero view-model (null quando disabilitato o dato non disponibile),
  // non sul valore numerico di remainingDistance: usare *ngIf sul numero direttamente
  // nasconderebbe la card esattamente quando l'utente arriva a fine tappa (remainingDistance
  // === 0 è falsy per *ngIf, ma è un dato valido, non l'assenza di dato) (vedi oc:8177).
  vm$: Observable<ITrackRemainingDistanceVm | null> = combineLatest([
    this._store.select(trackRemainingDistance),
    this._store.select(trackPositionStale),
    this._store.select(trackProgress),
    this._store.select(confOPTIONSShowTrackRemainingDistance),
  ]).pipe(
    map(([remainingDistance, stale, progress, enabled]) => {
      if (enabled === false || remainingDistance == null) {
        return null;
      }
      return {
        remainingDistance,
        stale,
        progressPercent: progress != null ? Math.round(progress * 100) : null,
      };
    }),
  );

  constructor(private _store: Store) {}
}
