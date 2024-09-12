import {Component, Input} from '@angular/core';
import {Filesystem, Directory, Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import GeoJsonToGpx from '@dwayneparton/geojson-to-gpx';
import tokml from 'geojson-to-kml';
import { keys } from 'localforage';
import { DeviceService } from 'wm-core/services/device.service';
@Component({
  selector: 'wm-track-download-urls',
  templateUrl: './track-download-urls.component.html',
  styleUrls: ['./track-download-urls.component.scss'],
})
export class WmTrackDownloadUrlsComponent {
  private _properties: {[key: string]: any};

  @Input() set properties(value: {[key: string]: any}) {
    this._properties = value;
    this._initializeDownloadUrls();
  }

  @Input() track: any;

  geojson: string;
  gpx: string;
  kml: string;
  osm: string;

  constructor(private _deviceSvc:DeviceService) {}

  catch (e) {
      console.error(e);
      console.log('---------');
    }

  export(to:string): void {
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
    const name = this._getName(this._properties?.name);
    const fileName = `${name}.${format}`;
    try {
      // Scrivi il file nel filesystem
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.External,
        encoding: Encoding.UTF8,
      });

      // Prepara il file per la condivisione
      const fileUrl = writeResult.uri;

      // Apri il menu di condivisione
      await Share.share({
        title: `Condividi il file ${fileName}`,
        url: fileUrl,
        dialogTitle: `Condividi il tuo file ${fileName}`,
      });
    } catch (e) {
      console.error("Errore durante l'esportazione e la condivisione:", e);
    }
  }

  save(data,format):void {
    this._deviceSvc.isBrowser ? this.webSave(data, format):this.mobileSave(data, format);
  }

  webSave(data: string, format: any): void  {
    const blob = new Blob([data], {type: 'text/plain'});
    const name = this._getName(this._properties?.name);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private _getName(name:string|{[keys:string]:string|undefined}):string {
  if(name == null) {
    return 'export';
  }
  if(typeof name === 'string') {
    return name;
  }
  const values = Object.values(name);
  return values[0];
}

  private _initializeDownloadUrls(): void {
    this.gpx = this._properties?.gpx_url;
    this.kml = this._properties?.kml_url;
    this.geojson = this._properties?.geojson_url;
    this.osm = this._properties?.osm_url;
  }
}
