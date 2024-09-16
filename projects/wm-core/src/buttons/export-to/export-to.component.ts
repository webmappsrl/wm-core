import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import GeoJsonToGpx from '@dwayneparton/geojson-to-gpx';
import {Filesystem, Directory, Encoding, WriteFileOptions} from '@capacitor/filesystem';
import {AlertController} from '@ionic/angular';
import tokml from 'geojson-to-kml';
import {DeviceService} from 'wm-core/services/device.service';
import {WmLoadingService} from 'wm-core/services/loading.service';
import {Share} from '@capacitor/share';
import {Plugins} from '@capacitor/core';
const {Permissions} = Plugins;
@Component({
  selector: 'wm-export-to-btn',
  templateUrl: './export-to.component.html',
  styleUrls: ['./export-to.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ExportToBtnComponent {
  @Input() input: any;
  @Input() to: 'gpx' | 'kml' | 'geojson' | 'json' = 'gpx';

  constructor(
    private _loadingSvc: WmLoadingService,
    private _deviceSvc: DeviceService,
    private _alertCtrl: AlertController,
  ) {}

  export(): void {
    this._loadingSvc.show(`build ${this.to} file`);
    let output;
    let g;
    try {
      if (this.input == null && this.input.geojson == null) {
        throw new Error('no data to export');
      }
      g = this._toGeoJSON(this.input.geojson);
      g.properties = {...g.properties, ...this.input.rawData, ...{title: this.input.title}};
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
    this.save(output, this.to, g.properties);
  }

  async mobileSave(data, format, name): Promise<void> {
    this.requestStoragePermission();

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

  save(data, format, properties): void {
    const name = this._getName(properties.name);
    this._deviceSvc.isMobile
      ? this.mobileSave(data, format, name)
      : this.webSave(data, format, name);
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

  webSave(data: string, format: any, name: string): void {
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
