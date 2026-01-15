import {Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  standalone: false,
  selector: 'wm-tab-nearest-poi',
  templateUrl: './tab-nearest-poi.component.html',
  styleUrls: ['./tab-nearest-poi.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WmTabNearestPoiComponent {
  @Input() nearestPoi: any | null;
}
