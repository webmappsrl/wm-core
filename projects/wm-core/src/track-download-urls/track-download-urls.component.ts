import {Component, Input} from '@angular/core';
import {Filesystem, Directory, Encoding, WriteFileOptions, PermissionStatus} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import GeoJsonToGpx from '@dwayneparton/geojson-to-gpx';
import {AlertController} from '@ionic/angular';
import tokml from 'geojson-to-kml';
import {DeviceService} from 'wm-core/services/device.service';
import {Plugins} from '@capacitor/core';
const {Permissions} = Plugins;
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

  constructor(private _deviceSvc: DeviceService, private _alertCtrl: AlertController) {
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
    const name = this._getName(this._properties?.name);
    const fileName = `${name}.${format}`;
    try {
      const optionsDocuments: WriteFileOptions = {
        path: fileName,
        data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      };
      const writeResult = await Filesystem.writeFile(optionsDocuments);

      // Prepara il file per la condivisione
      const fileUrl = writeResult.uri;
      this.showSuccessPopup(fileName, fileUrl, data);
    } catch (e) {
      console.error("Errore durante l'esportazione e la condivisione:", e);
    }
  }

  async requestStoragePermission() {
    const permission = await Permissions.query({name: 'storage'});

    if (permission.state !== 'granted') {
      const result = await Permissions.request({name: 'storage'});
      if (result.state !== 'granted') {
        throw new Error('Permesso di archiviazione non concesso');
      }
    }
  }

  save(data, format): void {
    this._deviceSvc.isBrowser ? this.webSave(data, format):this.mobileSave(data, format); 
  }

  async showSuccessPopup(fileName: string, fileUrl: string, data: any): Promise<void> {
    const alert = await this._alertCtrl.create({
      header: 'File salvato',
      message: `File correttamente salvato in ${fileUrl} come ${fileName} Vuoi condividerlo?`,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Condivisione annullata');
          },
        },
        {
          text: 'Sì',
          handler: async () => {
            // Scrivi il file nel filesystem
            const options: WriteFileOptions = {
              path: fileName,
              data,
              directory: Directory.Cache,
              encoding: Encoding.UTF8,
              recursive: true,
            };
            const writeResult = await Filesystem.writeFile(options);
            // Prepara il file per la condivisione
            const fileUrl = writeResult.uri;
            await Share.share({
              title: `Condividi il file ${fileName}`,
              url: fileUrl,
              dialogTitle: `Condividi il tuo file ${fileName}`,
            });
          },
        },
      ],
    });

    await alert.present();
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
    const name = this._getName(this._properties?.name);
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

  private _initializeDownloadUrls(): void {
    this.gpx = this._properties?.gpx_url;
    this.kml = this._properties?.kml_url;
    this.geojson = this._properties?.geojson_url;
    this.osm = this._properties?.osm_url;
  }
}
