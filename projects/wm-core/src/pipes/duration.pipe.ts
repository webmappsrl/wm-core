import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Pipe({
  name: 'duration'
})
export class DurationPipe implements PipeTransform {
  private readonly _units = {
    hours: 'h',
    minutes: 'm'
  };

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: number, format: 'text' | 'html' = 'text'): string | SafeHtml {
    const hours: number = Math.floor(value / 60);
    const minutes: number = Math.round(value % 60);

    if (format === 'html') {
      let durationHtml = `<span class="value">${minutes}</span> <span class="unit">${this._units.minutes}</span>`;
      if(hours > 0) {
        durationHtml = `<span class="value">${hours}</span> <span class="unit">${this._units.hours}</span> ${durationHtml}`;
      }
      return this.sanitizer.bypassSecurityTrustHtml(durationHtml);
    }

    let durationString =`${minutes}${this._units.minutes}`;
    if(hours > 0) {
      durationString = `${hours}${this._units.hours} ${durationString}`;
    }
    return durationString;
  }
}
