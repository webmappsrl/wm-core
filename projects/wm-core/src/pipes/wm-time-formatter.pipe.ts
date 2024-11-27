import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'wmTimeFormatter'
})
export class WmTimeFormatterPipe implements PipeTransform {

  transform(value: number): string {
    const roundedValue = Math.round(value);

    const hours: number = Math.floor(roundedValue / 3600);
    const minutes: number = Math.floor((roundedValue % 3600) / 60);
    const seconds: number = roundedValue % 60;

    let result = '';

    if (hours > 0) {
      result += `${hours}h `;
    }

    if (minutes > 0) {
      result += `${minutes}m `;
    }

    result += `${seconds}s`;

    return result.trim();
  }
}
