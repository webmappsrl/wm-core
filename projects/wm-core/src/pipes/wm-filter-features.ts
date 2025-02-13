import {Pipe, PipeTransform} from '@angular/core';
import {Feature} from 'geojson';

@Pipe({
  name: 'wmFilterFeatures',
  pure: false, // opzionale, se vuoi che il filtro si aggiorni dinamicamente
})
export class WmFilterFeaturesPipe implements PipeTransform {
  transform(features: Feature[], filter: string): any[] {
    if (!features || !filter) {
      return features;
    }
    return features.filter(feature =>
      feature.properties?.carg_code?.toLowerCase().includes(filter.toLowerCase()),
    );
  }
}
