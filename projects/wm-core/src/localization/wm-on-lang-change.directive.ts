import {ChangeDetectorRef, Directive, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';
import {LangService} from './lang.service';

/**
 * Direttiva da applicare a componenti/elementi con ChangeDetectionStrategy.OnPush
 * che devono aggiornarsi quando cambia la lingua.
 *
 * Esempio:
 * <wm-profile-auth wmOnLangChange ...></wm-profile-auth>
 */
@Directive({
  selector: '[wmOnLangChange]',
  standalone: false,
})
export class WmOnLangChangeDirective implements OnDestroy {
  private _sub: Subscription;

  constructor(private _lang: LangService, private _cdr: ChangeDetectorRef) {
    this._sub = this._lang.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }
}

