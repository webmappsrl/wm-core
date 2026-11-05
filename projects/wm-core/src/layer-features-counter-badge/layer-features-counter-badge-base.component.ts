import {Directive, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {layerFeaturesCount, layerFeaturesTotalCount} from '@wm-core/store/features/ec/ec.selector';
import {LayerFeaturesCount} from '@wm-types/feature';
import {BehaviorSubject, Observable, of} from 'rxjs';

/**
 * Logica condivisa fra `wm-layer-features-counter-badge` di default e la sua variante
 * camminiditalia (oc:8918): conteggi di Elastic e `stageCount$`, che di default emette `null`.
 * `@Directive()` astratta, mai soggetta a `fileReplacements`: ogni sottoclasse dichiara `selector`,
 * `templateUrl` e `styleUrls`.
 */
@Directive()
export abstract class LayerFeaturesCounterBadgeBaseComponent {
  @Input() useTotal = false;

  layerFeaturesCount$: Observable<LayerFeaturesCount> = this._store.select(layerFeaturesCount);
  layerFeaturesTotalCount$: Observable<LayerFeaturesCount> = this._store.select(layerFeaturesTotalCount);
  /** Numero di tappe del layer senza varianti; `null` se non disponibile (conteggio di Elastic). */
  stageCount$: Observable<number | null> = of(null);

  protected _layerId$ = new BehaviorSubject<string | undefined>(undefined);
  private _layerId: string;

  constructor(protected _store: Store) {}

  @Input()
  set layerId(value: string) {
    this._layerId = value;
    this._layerId$.next(value);
  }
  get layerId(): string {
    return this._layerId;
  }
}
