import {Directive, ElementRef, Input, OnChanges, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';
import {PassportProgress} from '@wm-types/passport';
import {PassportService} from '../passport.service';
import {passportRingDegrees, toLayerId} from '../passport.utils';

/** Classe applicata al logo quando l'anello è visibile; lo stile sta nella variante camminiditalia. */
const RING_CLASS = 'wm-passport-logo-ring';
/** Proprietà CSS con i gradi dell'arco verde. */
const RING_DEG_VAR = '--wm-passport-ring-deg';

/**
 * Anello di avanzamento del passaporto attorno al logo del layer (oc:8166, wireframe 1/V0b).
 *
 * È una direttiva sul logo esistente, non un componente che lo avvolge: i selettori della
 * variante camminiditalia di `wm-home-layer` presuppongono il logo figlio diretto di `wm-img`.
 * L'anello compare solo per l'utente loggato su un layer con tappe, come il badge.
 */
@Directive({
  standalone: false,
  selector: '[wmPassportLogoRing]',
})
export class WmPassportLogoRingDirective implements OnChanges, OnDestroy {
  /** Id del layer: in `ILAYER` è una stringa. */
  @Input('wmPassportLogoRing') layerId: string | number | null;

  private _sub: Subscription | null = null;

  constructor(
    private _el: ElementRef<HTMLElement>,
    private _passportSvc: PassportService,
  ) {}

  /** Si risottoscrive al progresso quando cambia il layer. */
  ngOnChanges(): void {
    this._sub?.unsubscribe();
    this._sub = this._passportSvc
      .visibleProgress(toLayerId(this.layerId))
      .subscribe(progress => this._apply(progress));
  }

  /** Chiude la sottoscrizione. */
  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  /**
   * Applica o toglie l'anello sull'elemento.
   *
   * @param progress Avanzamento del cammino, `null` se l'anello non va mostrato.
   */
  private _apply(progress: PassportProgress | null): void {
    const el = this._el.nativeElement;
    if (progress) {
      const deg = passportRingDegrees(progress.percent);
      el.classList.add(RING_CLASS);
      el.style.setProperty(RING_DEG_VAR, `${Math.round(deg * 10) / 10}deg`);
    } else {
      el.classList.remove(RING_CLASS);
      el.style.removeProperty(RING_DEG_VAR);
    }
  }
}
