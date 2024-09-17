import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'getFormFieldValue',
})
export class getFormFieldValuePipe implements PipeTransform {
  transform(values: any[], id: any): any {
    const res = values.filter(v => v.value === id);
    if (res.length > 0) {
      return res[0].label;
    } else return '';
  }
}
