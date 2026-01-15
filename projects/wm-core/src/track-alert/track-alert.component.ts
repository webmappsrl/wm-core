import {ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {Filesystem, Directory, Encoding, WriteFileOptions} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import GeoJsonToGpx from '@dwayneparton/geojson-to-gpx';
import {Feature} from 'geojson';
import tokml from 'geojson-to-kml';
import {DeviceService} from '@wm-core/services/device.service';
@Component({
  standalone: false,
  selector: 'wm-track-alert',
  templateUrl: './track-alert.component.html',
  styleUrls: ['./track-alert.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTrackAlertComponent {
  @Input() alert: string = 'Questo percorso non è accessibile';

  constructor() {}
}
