import {Component, Input} from '@angular/core';

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

  geojson: string;
  gpx: string;
  kml: string;
  osm: string;

  private _initializeDownloadUrls(): void {
    this.gpx = this._properties?.gpx_url;
    this.kml = this._properties?.kml_url;
    this.geojson = this._properties?.geojson_url;
    this.osm = this._properties?.osm_url;
  }
}
