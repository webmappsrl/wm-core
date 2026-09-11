import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {SearchBarBaseComponent} from './search-bar-base.component';

/**
 * Search box di default, usata da tutti gli shard tranne camminiditalia (vedi variante
 * `.camminiditalia.ts`, che aggiunge sopra la stessa ricerca il pannello filtri "Cerca il tuo
 * cammino", oc:8414). Logica in `SearchBarBaseComponent`.
 */
@Component({
  standalone: false,
  selector: 'wm-searchbar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmSearchBarComponent extends SearchBarBaseComponent {}
