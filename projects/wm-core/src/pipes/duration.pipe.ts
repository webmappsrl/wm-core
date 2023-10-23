import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'duration',
})
export class DurationPipe implements PipeTransform {
  transform(value: number): string {
    const hours: number = Math.floor(value / 60);
    const minutes: number = Math.round(value % 60);

    return `${hours} : ${minutes > 9 ? minutes : '0' + minutes} h`;
  }
}
