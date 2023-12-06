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
  @Input() saveFileFn = (data: string, format: string, track: any): void => {
    const blob = new Blob([data], {type: 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  @Input() to: 'gpx' | 'kml' | 'geojson' = 'gpx';
  @Input() track: any;

  constructor(private _loadingSvc: WmLoadingService) {}

  export(): void {
    this._loadingSvc.show(`build ${this.to} file`);
    let output;
    let g = this._toGeoJSON(this.track.geojson);
    g.properties = {...g.properties, ...this.track.rawData, ...{title: this.track.title}};
    switch (this.to) {
      case 'gpx':
        const options = {
          metadata: {
            name: this.track.title,
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
      default:
        throw new Error('Unsupported format');
    }
    this._loadingSvc.close(`build ${this.to} file`);
    this.saveFileFn(output, this.to, this.track);
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
      throw new Error("L'oggetto fornito non è un LineString valido.");
    }
  }
}
