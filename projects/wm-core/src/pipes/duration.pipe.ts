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
      let html = `<span class="value">${minutes}</span> <span class="unit">${this._units.minutes}</span>`;
      if(hours > 0) {
        html = `<span class="value">${hours}</span> <span class="unit">${this._units.hours}</span> ${html}`;
      }
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    return hours > 0
      ? `${hours}${this._units.hours} ${minutes}${this._units.minutes}`
      : `${minutes}${this._units.minutes}`;
  }
}
