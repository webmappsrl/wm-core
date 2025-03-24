import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Pipe({
  name: 'duration'
})
export class DurationPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: number, format: 'text' | 'html' = 'text'): string | SafeHtml {
    const hours: number = Math.floor(value / 60);
    const minutes: number = Math.round(value % 60);

    if (format === 'html') {
      const html = hours > 0
        ? `<span class="value">${hours}</span> <span class="unit">h</span> <span class="value">${minutes}</span> <span class="unit">m</span>`
        : `<span class="value">${minutes}</span> <span class="unit">m</span>`;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    return hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;
  }
}
