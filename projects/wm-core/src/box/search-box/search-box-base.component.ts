import {Directive} from '@angular/core';
import {Observable} from 'rxjs';
import {BaseBoxComponent} from '../box';
import {Hit} from '@wm-types/elastic';
import {icons} from '@wm-core/store/icons/icons.selector';

/**
 * Logica condivisa fra `wm-search-box` di default e la sua variante camminiditalia (oc:8701). Ogni
 * sottoclasse dichiara `selector`, `templateUrl` e `styleUrls`; la variante aggiunge il chip del
 * passaporto.
 *
 * `@Directive()` astratta, come `BaseBoxComponent` che estende: genera la factory DI (`ɵfac`) da
 * cui le sottoclassi ereditano i parametri del costruttore; la guardia è in
 * `search-box-base.component.spec.ts`.
 */
@Directive()
export abstract class SearchBoxBaseComponent extends BaseBoxComponent<Hit> {
  icons$: Observable<{[key: string]: string}> = this._store.select(icons);
}
