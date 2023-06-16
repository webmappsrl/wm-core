import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'wmhowmany',
  pure: false,
})
export class WmHowMany implements PipeTransform {
  transform(
    identifier: any,
    stats: {
      [name: string]: {[identifier: string]: any};
    },
  ): number {
    return +stats[identifier] || 0;
  }
}
