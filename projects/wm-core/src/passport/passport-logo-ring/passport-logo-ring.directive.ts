import {Directive, ElementRef, Input, OnChanges, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';
import {PassportRoute} from '@wm-types/passport';
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
 * L'anello compare solo per l'utente loggato su un cammino col passaporto acceso e con tappe,
 * come il badge.
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
      .visibleRoute(toLayerId(this.layerId))
      .subscribe(route => this._apply(route));
  }

  /** Chiude la sottoscrizione. */
  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  /**
   * Applica o toglie l'anello sull'elemento.
   *
   * @param route Cammino, `null` se l'anello non va mostrato.
   */
  private _apply(route: PassportRoute | null): void {
    const el = this._el.nativeElement;
    if (route) {
      const deg = passportRingDegrees(route.percent);
      el.classList.add(RING_CLASS);
      el.style.setProperty(RING_DEG_VAR, `${Math.round(deg * 10) / 10}deg`);
    } else {
      el.classList.remove(RING_CLASS);
      el.style.removeProperty(RING_DEG_VAR);
    }
  }
}
