import {ChangeDetectionStrategy, Component, ViewEncapsulation, inject} from '@angular/core';
import {Observable, combineLatest} from 'rxjs';
import {switchMap, tap} from 'rxjs/operators';
import {ecTracks, ecTracksLoading} from '@wm-core/store/features/ec/ec.selector';
import {ActiveRouteService} from '@wm-core/diaries/active-route.service';
import {WmHomeLayerBaseComponent} from './home-layer-base.component';

@Component({
  standalone: false,
  selector: 'wm-home-layer',
  templateUrl: './home-layer.component.camminiditalia.html',
  styleUrls: ['./home-layer.component.camminiditalia.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLayerComponent extends WmHomeLayerBaseComponent {
  private readonly _activeRoute = inject(ActiveRouteService);
  /**
   * Pulsante del diario solo se il telefono è stato vicino al cammino (oc:8169, ciclo 2): le tappe
   * del cammino aperto arrivano da Elastic e si confrontano con le posizioni salvate.
   */
  readonly diaryCanWrite$: Observable<boolean> = combineLatest([
    this.layer$,
    this._store.select(ecTracks),
    // una posizione nuova, anche a dettaglio già aperto, rifà il confronto
    this._activeRoute.lastPositionAt$,
    // durante il caricamento le tappe sono quelle della ricerca precedente: non si valuta
    this._store.select(ecTracksLoading),
  ]).pipe(
    tap(([layer, hits, , loading]) => {
      if (layer?.id == null || loading) return;
      const trackIds = (hits ?? []).filter(h => (h.layers ?? []).includes(+layer.id)).map(h => h.id);
      void this._activeRoute.evaluateLayer(layer.id, trackIds, layer.bbox);
    }),
    switchMap(([layer]) => this._activeRoute.canWrite$([layer?.id])),
  );
}
