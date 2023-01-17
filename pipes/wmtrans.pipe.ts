import {ChangeDetectorRef, Pipe, PipeTransform} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Pipe({
  name: 'wmtrans',
  pure: false,
})
export class WmTransPipe extends TranslatePipe {
  constructor(private _translateSvc: TranslateService, _cdr: ChangeDetectorRef) {
    super(_translateSvc, _cdr);
  }

  transform(value: any, ...args: unknown[]): string {
    if (value) {
      if (value[this._translateSvc.currentLang]) {
        return value[this._translateSvc.currentLang];
      }
      if (value[this._translateSvc.defaultLang]) {
        return value[this._translateSvc.defaultLang];
      }
      if (typeof value === 'string') {
        return super.transform(value);
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
