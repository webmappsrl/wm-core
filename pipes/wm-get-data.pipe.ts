import {Pipe, PipeTransform} from '@angular/core';
export interface IHIT {
  cai_scale: string;
  feature_image: string | any;
  ref: string;
  distance: string;
  name: string;
  id: number;
  taxonomyActivities: string[];
  taxonomyWheres: string[];
  layers: number[];
}

@Pipe({
  name: 'wmgetdata',
})
export class WmGetDataPipe implements PipeTransform {
  constructor() {}

  transform(value: any, ...args: unknown[]): any {
    const prop = value.properties;
    const taxonomy = prop.taxonomy;
    const activity = taxonomy.activity;
    const taxonomyActivities = activity != null ? activity.map(a => a.identifier) : null;
    return {
      name: prop.name,
      feature_image: prop.feature_image,
      distance: prop.distance,
      cai_scale: prop.difficulty,
      taxonomyActivities: taxonomyActivities,
    };
  }
}
