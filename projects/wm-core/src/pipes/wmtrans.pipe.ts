import {ChangeDetectorRef, Pipe} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {LangService} from '../localization/lang.service';

@Pipe({
  name: 'wmtrans',
  pure: false,
})
export class WmTransPipe extends TranslatePipe {
  constructor(private _translateSvc: LangService, private _cdr: ChangeDetectorRef) {
    super(_translateSvc, _cdr);
  }

  override transform(value: any, ...args: unknown[]): string {
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
      if (typeof value === 'number') {
        return super.transform(value.toString());
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
