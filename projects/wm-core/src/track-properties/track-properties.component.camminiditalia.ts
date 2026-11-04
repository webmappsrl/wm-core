// Variante camminiditalia di wm-track-properties (oc:8169), attivata con `fileReplacements`: stesso
// template e stessi stili del default, accende la sezione del diario e, dal ciclo 2, mostra il
// pulsante solo se il telefono è stato vicino al cammino. Non importa nulla da
// `track-properties.component.ts`, che `fileReplacements` sostituisce con questo file.
import {ChangeDetectionStrategy, Component, ViewEncapsulation, inject} from '@angular/core';
import {LineString} from 'geojson';
import {Observable, combineLatest} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {ActiveRouteService} from '@wm-core/diaries/active-route.service';
import {TrackPropertiesBaseComponent} from './track-properties-base.component';

@Component({
  standalone: false,
  selector: 'wm-track-properties',
  templateUrl: './track-properties.component.html',
  styleUrls: ['./track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackPropertiesComponent extends TrackPropertiesBaseComponent {
  override readonly showDiaries: boolean = true;
  private readonly _activeRoute = inject(ActiveRouteService);
  /**
   * Pulsante del diario solo se il telefono è stato vicino al cammino (oc:8169, ciclo 2): la linea
   * della tappa è già caricata, si confronta con le posizioni salvate e rende attivi i suoi cammini.
   */
  override diaryCanWrite$: Observable<boolean> = combineLatest([
    this.currentLayer$,
    this.ecTrack$,
    // una posizione nuova, anche a dettaglio già aperto, rifà il confronto
    this._activeRoute.lastPositionAt$,
  ]).pipe(
    map(([layer, track]) => ({
      line: track?.geometry as LineString | undefined,
      layerIds: [layer?.id, ...(((track?.properties as {layers?: number[]})?.layers) ?? [])].filter(
        (id, i, all) => id != null && all.indexOf(id) === i,
      ),
    })),
    tap(({line, layerIds}) => void this._activeRoute.evaluateTrack(line, layerIds)),
    switchMap(({layerIds}) => this._activeRoute.canWrite$(layerIds)),
  );
}
