import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'getFormFieldIcn',
})
export class getFormFieldIcnPipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case 'text':
      default:
        return 'icon-outline-list';
      case 'select':
        return 'icon-outline-activities';
    }
  }
}
