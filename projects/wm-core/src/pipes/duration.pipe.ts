import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

export const HOUR_UNIT = 'h';
export const MINUTE_UNIT = 'm';

@Pipe({
  name: 'duration'
})
export class DurationPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: number, format: 'text' | 'html' = 'text'): string | SafeHtml {
    const hours: number = Math.floor(value / 60);
    const minutes: number = Math.round(value % 60);

    if (format === 'html') {
      let durationHtml = `<span class="value">${minutes}</span> <span class="unit">${MINUTE_UNIT}</span>`;
      if(hours > 0) {
        durationHtml = `<span class="value">${hours}</span> <span class="unit">${HOUR_UNIT}</span> ${durationHtml}`;
      }
      return this.sanitizer.bypassSecurityTrustHtml(durationHtml);
    }

    let durationString =`${minutes}${MINUTE_UNIT}`;
    if(hours > 0) {
      durationString = `${hours}${HOUR_UNIT} ${durationString}`;
    }
    return durationString;
  }
}
