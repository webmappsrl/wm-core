import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {FilterOption} from '@wm-types/config';

/**
 * Riga accordion per un singolo filtro del pannello "Cerca il tuo cammino" (oc:8414): header con
 * icona proiettata, etichetta, pillola col valore selezionato e chevron; pannello con opzioni a
 * chip (bordo/testo in colore primario se selezionata, nessun contatore) — fedele al riferimento
 * camminiditalia.org. La selezione si applica subito (nessun pulsante di conferma: il filtro è
 * già live), la riga resta aperta finché l'utente non tocca di nuovo l'header. Usato
 * esclusivamente da `wm-searchbar`
 * (`search-bar.component.camminiditalia.ts`): nessuna variante generica, non è mai montato per
 * altri shard.
 * Apertura esclusiva tra le 7 righe gestita dal genitore: questo componente è puramente
 * controllato via `[open]`/`(toggleEVT)`, non tiene stato di apertura proprio (a differenza di
 * `wm-config-detail`, che dall'oc:8458 permette apertura multipla — qui l'esclusività resta
 * intenzionale e specifica di questo pannello filtri, non un principio condiviso).
 */
@Component({
  standalone: false,
  selector: 'wm-home-route-filter-row',
  templateUrl: './home-route-filter-row.component.html',
  styleUrls: ['./home-route-filter-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HomeRouteFilterRowComponent {
  @Input() label = '';
  @Input() open = false;
  @Input() options: FilterOption[] = [];
  @Input() selected: string[] = [];

  @Output() selectionChangeEVT: EventEmitter<string[]> = new EventEmitter<string[]>();
  @Output() toggleEVT: EventEmitter<void> = new EventEmitter<void>();

  /** Prefisso univoco per istanza, per id/aria-controls non duplicati con più righe filtro nella stessa pagina. */
  readonly uid = Math.random().toString(36).slice(2);

  /**
   * `true` se almeno un'opzione è selezionata — pilota lo stato visivo "attivo" della riga
   * (bordo/icona/etichetta in colore primario + pillola col valore) indipendentemente da `open`:
   * fedele al riferimento camminiditalia.org, dove un filtro impostato resta evidenziato anche
   * dopo aver chiuso l'accordion.
   */
  get isActive(): boolean {
    return this.selected.length > 0;
  }

  /** Etichette delle opzioni selezionate, unite da virgola — testo mostrato nella pillola quando `isActive`. */
  get selectedLabel(): string {
    return this.options
      .filter(o => this.selected.includes(o.value))
      .map(o => o.label)
      .join(', ');
  }

  /**
   * `true` se `value` è tra quelli selezionati.
   * @param value Valore dell'opzione da verificare.
   */
  isSelected(value: string): boolean {
    return this.selected.includes(value);
  }

  /**
   * Alterna la selezione di `value` (multi-select, semantica OR) ed emette la nuova selezione.
   * @param value Valore dell'opzione alternata.
   */
  toggleOption(value: string): void {
    const next = this.isSelected(value)
      ? this.selected.filter(v => v !== value)
      : [...this.selected, value];
    this.selectionChangeEVT.emit(next);
  }
}
