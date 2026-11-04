import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import {LangService} from '@wm-core/localization/lang.service';
import {intlLocale, toIsoDate} from '@wm-core/passport/passport.utils';
import {DateRange, DateRangePicking, daysBetween, describeDateRange, formatDateRange, nextRange} from './date-range.utils';

/** Giorno colorato di `ion-datetime`. */
interface HighlightedDate {
  date: string;
  textColor: string;
  backgroundColor: string;
}

/**
 * Calendario a intervallo (oc:8169, ciclo 4), usato dal diario e dalla richiesta cartacea del
 * Passaporto: un campo che apre un `ion-datetime` in un foglio dal basso. `ion-datetime` non ha
 * l'intervallo: si usa la selezione multipla, che emette a ogni tocco (anche sullo stesso giorno, che
 * lo deseleziona), si ricava il giorno toccato e si tengono selezionati solo gli estremi, colorando i
 * giorni in mezzo.
 */
@Component({
  standalone: false,
  selector: 'wm-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDateRangePickerComponent {
  /** Intervallo corrente, `null` se vuoto. */
  @Input() value: DateRange | null = null;
  /** Ultimo giorno selezionabile `AAAA-MM-GG`. */
  @Input() max: string | undefined;
  /** Titolo del foglio e nome accessibile del campo (già tradotto). */
  @Input() label = '';
  /** Testo del campo vuoto (già tradotto). */
  @Input() placeholder = '';
  /** Campo segnato come non valido. */
  @Input() invalid = false;
  /** Mostra il tasto che svuota il campo. */
  @Input() clearable = false;
  /** Intervallo confermato, `null` se svuotato. */
  @Output() valueChange = new EventEmitter<DateRange | null>();

  /** Foglio aperto. */
  isOpen = false;
  /** Intervallo in scelta nel foglio. */
  pending: DateRange | null = null;
  /** Giorni selezionati in `ion-datetime`: solo gli estremi. */
  selected: string[] = [];
  /** Giorni in mezzo, colorati. */
  highlighted: HighlightedDate[] = [];

  private _picking: DateRangePicking = 'start';
  /** `true` dopo una chiusura da codice: il suo `didDismiss` in arrivo va ignorato (oc:8761). */
  private _dismissExpected = false;
  private _cdr = inject(ChangeDetectorRef);
  private _langSvc = inject(LangService);

  /** @returns la lingua del calendario: quella dell'app */
  get locale(): string {
    return intlLocale(this._langSvc.currentLang);
  }

  /** @returns il testo del campo chiuso */
  get formatted(): string {
    return formatDateRange(this.value, this.locale);
  }

  /** @returns il testo sotto il calendario, `null` senza intervallo */
  get summary(): {key: string; params: Record<string, string>} | null {
    return this.pending ? describeDateRange(this.pending, this.locale) : null;
  }

  /** Apre il foglio partendo dall'intervallo corrente. */
  open(): void {
    this.pending = this.value ? {...this.value} : null;
    this._picking = 'start';
    this._sync();
    this.isOpen = true;
    this._cdr.markForCheck();
  }

  /**
   * Tocco nel calendario: il giorno aggiunto o tolto rispetto alla selezione precedente.
   *
   * @param value Valore di `ionChange` (array in selezione multipla).
   */
  onCalendarChange(value: string | string[] | null | undefined): void {
    const now = (Array.isArray(value) ? value : value ? [value] : []).map(toIsoDate);
    const tapped = now.find(d => !this.selected.includes(d)) ?? this.selected.find(d => !now.includes(d));
    if (!tapped) return;
    const step = nextRange(this.pending, this._picking, tapped);
    this.pending = step.range;
    this._picking = step.picking;
    this._sync();
    this._cdr.markForCheck();
  }

  /** Applica l'intervallo scelto e chiude. */
  confirm(): void {
    if (this.pending) this.valueChange.emit({...this.pending});
    this.cancel();
  }

  /** Chiude senza applicare. */
  cancel(): void {
    if (this.isOpen) this._dismissExpected = true;
    this.isOpen = false;
    this._cdr.markForCheck();
  }

  /**
   * `didDismiss` del foglio: dopo una chiusura da codice non tocca lo stato (il foglio può essere già
   * stato riaperto); dopo un trascinamento o un tocco sullo sfondo lo segna chiuso.
   */
  onDismiss(): void {
    if (this._dismissExpected) {
      this._dismissExpected = false;
      return;
    }
    this.isOpen = false;
    this._cdr.markForCheck();
  }

  /** Svuota il campo. */
  clear(): void {
    this.valueChange.emit(null);
  }

  /** Allinea selezione e colori all'intervallo in scelta. */
  private _sync(): void {
    const range = this.pending;
    this.selected = !range ? [] : range.start === range.end ? [range.start] : [range.start, range.end];
    this.highlighted = !range
      ? []
      : daysBetween(range).map(date => ({
          date,
          textColor: 'var(--ion-color-primary-shade, #c45a00)',
          backgroundColor: 'rgba(var(--ion-color-primary-rgb, 240, 119, 33), 0.16)',
        }));
  }
}
