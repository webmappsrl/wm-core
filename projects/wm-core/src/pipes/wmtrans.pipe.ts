import {Pipe, PipeTransform} from '@angular/core';
import {LangService} from '../localization/lang.service';

@Pipe({
  name: 'wmtrans',
  pure: false,
  standalone: false,
})
export class WmTransPipe implements PipeTransform {
  constructor(private _translateSvc: LangService) {}

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
