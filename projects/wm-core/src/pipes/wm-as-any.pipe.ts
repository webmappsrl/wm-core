import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'wmAsAny',
})
export class WmAsAny implements PipeTransform {
  transform(val: unknown): any {
    return val as any;
  }
}
