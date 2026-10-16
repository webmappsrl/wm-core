import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Vero se il testo troncato supera lo spazio disponibile. Il pixel di tolleranza assorbe gli
 * arrotondamenti dei browser, che altrimenti mostrerebbero «Leggi tutto» su un testo già intero.
 *
 * @param scrollHeight Altezza del contenuto.
 * @param clientHeight Altezza visibile.
 * @returns Vero se c'è testo nascosto.
 */
export function isNoteOverflowing(scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight - clientHeight > 1;
}

/**
 * Nota del gestore sull'esito della richiesta di certificazione (oc:8671, wireframe E5). Chiusa
 * mostra 3 righe; «Leggi tutto» compare solo se il testo reale è più lungo, misurato con un
 * `ResizeObserver`. Aperta ha un'altezza massima e scorre al suo interno, perché il dettaglio del
 * cammino non scorre e il bottone di nuovo invio deve restare visibile.
 */
@Component({
  standalone: false,
  selector: 'wm-passport-note',
  templateUrl: './passport-note.component.html',
  styleUrls: ['./passport-note.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmPassportNoteComponent implements AfterViewInit, OnDestroy {
  @Input() note: string;
  @ViewChild('text') text: ElementRef<HTMLElement>;

  expanded = false;
  overflowing = false;

  private _observer: ResizeObserver | null = null;

  constructor(private _cdr: ChangeDetectorRef) {}

  /** «Leggi tutto» / «Mostra meno» serve solo se c'è testo nascosto, o se la nota è già aperta. */
  get showToggle(): boolean {
    return this.overflowing || this.expanded;
  }

  /** Misura il troncamento sul testo reale, anche quando cambiano larghezza o contenuto. */
  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined' || !this.text) return;
    this._observer = new ResizeObserver(() => this._measure());
    this._observer.observe(this.text.nativeElement);
  }

  /** Smette di osservare il testo. */
  ngOnDestroy(): void {
    this._observer?.disconnect();
    this._observer = null;
  }

  /** Apre o chiude la nota. */
  toggle(): void {
    this.expanded = !this.expanded;
  }

  /** Aggiorna `overflowing`, solo a nota chiusa: aperta il testo è intero per definizione. */
  private _measure(): void {
    if (this.expanded) return;
    const el = this.text.nativeElement;
    const overflowing = isNoteOverflowing(el.scrollHeight, el.clientHeight);
    if (overflowing !== this.overflowing) {
      this.overflowing = overflowing;
      this._cdr.markForCheck();
    }
  }
}
