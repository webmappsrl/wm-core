import {Component, Input, OnInit} from '@angular/core';
import {Filesystem, Directory, Encoding, WriteFileOptions} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import GeoJsonToGpx from '@dwayneparton/geojson-to-gpx';
import {Feature} from 'geojson';
import tokml from 'geojson-to-kml';
import {DeviceService} from '@wm-core/services/device.service';
@Component({
  selector: 'wm-track-download-urls',
  templateUrl: './track-download-urls.component.html',
  styleUrls: ['./track-download-urls.component.scss'],
})
export class WmTrackDownloadUrlsComponent implements OnInit {
  @Input() track: Feature;

  osm: string;

  constructor(private _deviceSvc: DeviceService) {}

  ngOnInit(): void {
    this.osm = this.track.properties?.osm_url;
  }

  export(to: string): void {
    let output;
    const g = this.track;
    switch (to) {
      case 'gpx':
        const options = {
          metadata: {
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
        output = JSON.stringify(g);
        break;
      default:
        throw new Error('Unsupported format');
    }
    this.save(output, to);
  }

  async mobileSave(data, format): Promise<void> {
    const name = this._getName(this.track.properties?.name);
    const fileName = `${name}.${format}`;
    try {
      const options: WriteFileOptions = {
        path: fileName,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      };
      const writeResult = await Filesystem.writeFile(options);
      // Prepara il file per la condivisione
      const url = writeResult.uri;
      await Share.share({
        title: `Condividi il file ${fileName}`,
        url,
        dialogTitle: `Condividi il tuo file ${fileName}`,
      });
    } catch (e) {
      console.error("Errore durante l'esportazione e la condivisione:", e);
    }
  }

  save(data, format): void {
    this._deviceSvc.isBrowser ? this.webSave(data, format) : this.mobileSave(data, format);
  }

  webSave(data: string, format: any): void {
    let mimeType: string;

    // Imposta il tipo MIME corretto in base al formato
    switch (format) {
      case 'gpx':
        mimeType = 'application/gpx+xml';
        break;
      case 'kml':
        mimeType = 'application/vnd.google-earth.kml+xml';
        break;
      case 'geojson':
        mimeType = 'application/geo+json';
        break;
      case 'json':
        mimeType = 'application/json';
        break;
      default:
        mimeType = 'text/plain'; // Tipo MIME generico
    }
    const blob = new Blob([data], {type: mimeType});
    const name = this._getName(this.track.properties?.name);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private _getName(name: string | {[keys: string]: string | undefined}): string {
    if (name == null) {
      return 'export';
    }
    if (typeof name === 'string') {
      return name.replace(/\s+/g, ''); // Rimuove tutti gli spazi
    }
    const values = Object.values(name);
    return values[0] ? values[0].replace(/\s+/g, '') : 'export'; // Rimuove spazi dal primo valore non undefined
  }
}
