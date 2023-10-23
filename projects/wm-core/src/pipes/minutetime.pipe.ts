import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'minutetime',
})
export class MinuteTimePipe implements PipeTransform {

  minuteString;
  hourString;

  constructor(private _translate: TranslateService) {
    this._translate.get(['generic.minute', 'generic.hour']).subscribe(t => {
      this.minuteString = t['generic.minute'];
      this.hourString = t['generic.hour'];
    })
  }

  transform(value: any, ...args: unknown[]): unknown {
    let result = ''
    if (value) {
      let hours = Math.floor(value / 60);
      let minutes = value % 60;
      result += hours ? `${hours} ${this.hourString} ` : '';
      result += `${minutes} ${this.minuteString}`;
    }
    return result;
  }
}
