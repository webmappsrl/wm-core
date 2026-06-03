import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  standalone: false,
  name: 'wmAsAny',
})
export class WmAsAny implements PipeTransform {
  transform(val: unknown): any {
    return val as any;
  }
}
