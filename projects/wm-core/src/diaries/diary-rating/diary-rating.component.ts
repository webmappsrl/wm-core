import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
  ViewEncapsulation,
  inject,
} from '@angular/core';

/** Valori della scala, da 1 a 5. */
export const DIARY_RATING_SCALE = [1, 2, 3, 4, 5] as const;

/** Distanza fra un timbro e il successivo nell'animazione di selezione (ms). */
export const DIARY_RATING_STAGGER_MS = 60;

/**
 * Scarpone `txn-boot` delle icone di wm-package (`resources/defaults/icons.json`), copiato qui:
 * quel file serve alle icone dei POI e non si carica dall'app.
 */
export const DIARY_RATING_BOOT_PATH =
  'M375.456 661.76l-39.68-13.216h-233.408v102.4c0 18.848 15.296 34.144 34.144 34.144v0h273.056c18.848 0 34.144-15.296 34.144-34.144v0-66.4l-34.144-11.424zM853.344 443.744h-136.544v34.144c0 18.848-15.296 34.144-34.144 34.144v0c-18.72-0.352-33.792-15.424-34.144-34.112v-55.264l-44.768-22.4-33.504 33.504c-5.92 6.176-14.208 10.016-23.424 10.016-6.496 0-12.544-1.92-17.632-5.216l0.128 0.064c-5.568-2.304-9.92-6.656-12.16-12.064l-0.064-0.16c-3.008-4.928-4.8-10.912-4.8-17.312 0-9.216 3.68-17.536 9.664-23.616l33.504-33.504-22.4-44.768h-55.232c-18.848 0-34.144-15.296-34.144-34.144s15.296-34.144 34.144-34.144v0h34.144v-102.4c0-18.848-15.296-34.144-34.144-34.144v0h-273.056c-9.44 0-17.952 3.808-24.128 10.016l-68.256 68.256c-6.176 6.176-9.984 14.72-10.016 24.128v0 375.456h238.944c3.872 0 7.584 0.64 11.040 1.792l-0.256-0.064 199.552 66.528h369.92v-136.544c-0.032-37.696-30.592-68.224-68.256-68.256v0zM853.344 716.8h-341.344v34.144c0 18.848 15.296 34.144 34.144 34.144v0h341.344c18.848 0 34.144-15.296 34.144-34.144v0-34.144h-68.256z';

/** Il timbro che si imprime: arriva grande e ruotato, rimbalza e si ferma. */
const STAMP_IN: Keyframe[] = [
  {transform: 'scale(1.4) rotate(-12deg)', opacity: 0.4},
  {transform: 'scale(0.9) rotate(2deg)', opacity: 1, offset: 0.65},
  {transform: 'scale(1) rotate(0deg)', opacity: 1},
];

/** Il timbro tolto: una dissolvenza breve, senza movimento. */
const STAMP_OUT: Keyframe[] = [{opacity: 0.35}, {opacity: 1}];

/**
 * Valutazione da 1 a 5 del diario (oc:8169, ciclo 2): cinque timbri tondi con lo scarpone. Nel
 * form i timbri sono pulsanti; un tocco sul valore già scelto lo azzera. L'animazione parte solo
 * al tocco, sui timbri che cambiano, mai al primo render né con la riduzione del movimento.
 */
@Component({
  standalone: false,
  selector: 'wm-diary-rating',
  templateUrl: './diary-rating.component.html',
  styleUrls: ['./diary-rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDiaryRatingComponent {
  /** Valore corrente, `null` se non dato. */
  @Input() value: number | null = null;
  /** Sola lettura: niente pulsanti né animazioni (dettaglio del diario). */
  @Input() readonly = false;
  /** `form` nel form, `small` nel dettaglio (senza bordo tratteggiato). */
  @Input() size: 'form' | 'small' = 'form';
  /** Etichetta della riga, già tradotta, per i nomi accessibili dei pulsanti. */
  @Input() label = '';
  /** Nuovo valore scelto, `null` se azzerato. */
  @Output() valueChange = new EventEmitter<number | null>();

  @ViewChildren('stamp') stamps!: QueryList<ElementRef<HTMLElement>>;

  readonly scale = DIARY_RATING_SCALE;
  readonly bootPath = DIARY_RATING_BOOT_PATH;

  private _cdr = inject(ChangeDetectorRef);

  /**
   * Il timbro `n` è pieno.
   *
   * @param n Valore del timbro.
   * @returns `true` se `n` è entro il valore.
   */
  isOn(n: number): boolean {
    return this.value != null && n <= this.value;
  }

  /**
   * Tocco su un timbro: sceglie il valore o, se è già quello, lo azzera.
   *
   * @param n Valore toccato.
   */
  select(n: number): void {
    if (this.readonly) return;
    const previous = this.value ?? 0;
    const next = this.value === n ? null : n;
    this.value = next;
    this.valueChange.emit(next);
    this._cdr.detectChanges();
    this._animate(previous, next ?? 0);
  }

  /**
   * Anima i timbri che cambiano: quelli accesi uno dopo l'altro, quelli spenti insieme.
   *
   * @param previous Valore prima del tocco (0 se non dato).
   * @param next Valore dopo il tocco (0 se azzerato).
   */
  private _animate(previous: number, next: number): void {
    if (this._reducedMotion()) return;
    const elements = this.stamps?.toArray().map(ref => ref.nativeElement) ?? [];
    if (next > previous) {
      elements.slice(previous, next).forEach((el, i) =>
        this._run(el, STAMP_IN, {
          duration: 250,
          delay: i * DIARY_RATING_STAGGER_MS,
          easing: 'cubic-bezier(.2,.8,.3,1.2)',
          fill: 'backwards',
        }),
      );
    } else {
      elements
        .slice(next, previous)
        .forEach(el => this._run(el, STAMP_OUT, {duration: 120, easing: 'ease-out'}));
    }
  }

  /**
   * Avvia un'animazione e la cancella alla fine: con Web Animations uno stile rimasto
   * prevarrebbe su quelli del template.
   *
   * @param el Elemento del timbro.
   * @param keyframes Fotogrammi.
   * @param options Durata, ritardo, curva.
   */
  private _run(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): void {
    if (typeof el.animate !== 'function') return;
    const animation = el.animate(keyframes, options);
    animation.finished?.then(() => animation.cancel()).catch(() => undefined);
  }

  /** @returns `true` se il sistema chiede di ridurre il movimento. */
  private _reducedMotion(): boolean {
    return typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }
}
