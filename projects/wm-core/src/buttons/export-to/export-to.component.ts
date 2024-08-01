import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import GeoJsonToGpx from '@dwayneparton/geojson-to-gpx';
import tokml from 'geojson-to-kml';
import {WmLoadingService} from 'wm-core/services/loading.service';

@Component({
  selector: 'wm-export-to-btn',
  templateUrl: './export-to.component.html',
  styleUrls: ['./export-to.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ExportToBtnComponent {
  @Input() input: any;
  @Input() saveFileFn = (data: string, format: string, input: any): void => {
    const blob = new Blob([data], {type: 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  @Input() to: 'gpx' | 'kml' | 'geojson' | 'json' = 'gpx';

  constructor(private _loadingSvc: WmLoadingService) {}

  export(): void {
    this._loadingSvc.show(`build ${this.to} file`);
    let output;
    let g;
    try {
      if(this.input && this.input.geojson) {
      let g = this._toGeoJSON(this.input.geojson);
      g.properties = {...g.properties, ...this.input.rawData, ...{title: this.input.title}};
      }
      switch (this.to) {
        case 'gpx':
          const options = {
            metadata: {
              name: this.input.title,
              ...g.properties,
            },
          };
          output = GeoJsonToGpx(g, options);
          output = new XMLSerializer().serializeToString(output);
          break;
        case 'kml':
          output = tokml(g);
          break;
        case 'geojson':
          output = JSON.stringify(g);
          break;
        case 'json':
          output = JSON.stringify(this.input);
          break;
        default:
          throw new Error('Unsupported format');
      }
    } catch (e) {
      console.error(e);
      console.log('---------');
      this._loadingSvc.close(`build ${this.to} file`);
    }
    this._loadingSvc.close(`build ${this.to} file`);
    this.saveFileFn(output, this.to, this.input);
  }

  private _toGeoJSON(obj): any {
    // Verifica se l'oggetto ha già il formato corretto
    if (obj.type === 'LineString' && Array.isArray(obj.coordinates)) {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: obj.coordinates,
        },
        properties: {...obj._properties},
      };
    } else {
      throw new Error(`L'oggetto fornito non è un ${this.to} valido.`);
    }
  }
}
