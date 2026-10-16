// Variante camminiditalia di wm-layer-box (oc:8701), attivata con `fileReplacements`: la logica
// comune sta in `LayerBoxBaseComponent`; il template è una copia di quello di default più l'anello,
// e una correzione al template di default va riportata a mano anche qui.
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Optional,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';
import {LayerFavoriteService} from '@wm-core/services/layer-favorite.service';
import {PassportService} from '@wm-core/passport/passport.service';
import {passportRingDegrees, toLayerId} from '@wm-core/passport/passport.utils';
import {LayerBoxBaseComponent} from './layer-box-base.component';

/** Anello del passaporto attorno al logo del cammino (oc:8701). */
export interface LayerBoxPassportRing {
  /** Gradi dell'arco verde, 0-360. */
  deg: number;
  percent: number;
  completed: boolean;
}

@Component({
  standalone: false,
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.camminiditalia.html',
  styleUrls: ['./layer-box.component.scss', './layer-box.component.camminiditalia.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends LayerBoxBaseComponent {
  /**
   * Anello del passaporto: dai cammini di `/api/passport`, mai da una `/progress` per card.
   * `null` se il cammino non è iniziato o l'utente non è loggato (oc:8701).
   */
  ring$: Observable<LayerBoxPassportRing | null> = of(null);

  constructor(
    langSvc: LangService,
    cdr: ChangeDetectorRef,
    store: Store,
    layerFavoriteSvc: LayerFavoriteService,
    private _passportSvc: PassportService,
    @Optional() @Inject(POSTHOG_CLIENT) posthogClient?: WmPosthogClient,
  ) {
    super(langSvc, cdr, store, layerFavoriteSvc, posthogClient);
  }

  /** Oltre ai preferiti della base, ricalcola l'anello quando cambia il layer. */
  ngOnChanges(): void {
    super.ngOnChanges();
    if (this.data?.layer?.id == null) {
      this.ring$ = of(null);
      return;
    }
    const layerId = toLayerId(this.data.layer.id);
    this.ring$ = this._passportSvc.passportRoutes$().pipe(
      map(routes => routes?.get(layerId) ?? null),
      map(route =>
        route
          ? {deg: passportRingDegrees(route.percent), percent: route.percent, completed: route.completed}
          : null,
      ),
    );
  }
}
