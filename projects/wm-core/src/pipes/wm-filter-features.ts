import {Pipe, PipeTransform} from '@angular/core';
import {Feature} from 'geojson';

@Pipe({
  standalone: false,
  name: 'wmFilterFeatures',
  pure: false, // opzionale, se vuoi che il filtro si aggiorni dinamicamente
})
export class WmFilterFeaturesPipe implements PipeTransform {
  transform(features: Feature[], filter: string): Feature[] {
    if (features == null) return [];
    if (!features || !filter) {
      return features.sort(this._sortFeatures);
    }
    return features
      .filter(feature =>
        feature.properties?.carg_code?.toLowerCase().includes(filter.toLowerCase()),
      )
      .sort(this._sortFeatures);
  }

  private _sortFeatures(a: Feature, b: Feature): number {
    const aCargCode = a.properties?.carg_code ?? '';
    const bCargCode = b.properties?.carg_code ?? '';

    // Confronta alfanumericamente le proprietà carg_code
    return aCargCode.localeCompare(bCargCode, undefined, {numeric: true, sensitivity: 'base'});
  }
}
