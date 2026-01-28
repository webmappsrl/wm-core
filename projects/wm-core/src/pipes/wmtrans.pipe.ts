import {ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {Subscription} from 'rxjs';
import {LangService} from '../localization/lang.service';

@Pipe({
  name: 'wmtrans',
  pure: false,
  standalone: false,
})
export class WmTransPipe implements PipeTransform, OnDestroy {
  private _sub: Subscription;

  constructor(private _translateSvc: LangService, private _cdr: ChangeDetectorRef) {
    // Quando cambia la lingua, forziamo il ricalcolo dei componenti che usano la pipe
    this._sub = this._translateSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  transform(value: any, ...args: unknown[]): string {
    if (value) {
      if (value[this._translateSvc.currentLang]) {
        return value[this._translateSvc.currentLang];
      }
      if (value[this._translateSvc.defaultLang]) {
        return value[this._translateSvc.defaultLang];
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return this._translateSvc.instant(`${value}`, ...args);
      }
      for (const val in value) {
        if (value[val]) {
          return value[val];
        }
      }
    }
    return '';
  }
}
