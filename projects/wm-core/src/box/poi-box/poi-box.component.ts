import {ChangeDetectionStrategy, Component, ViewEncapsulation, EventEmitter, Input, Output} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';

interface PoiBoxFeature extends WmFeature<Point> {
  distanceFromCurrentLocation?: number;
}

@Component({
  selector: 'wm-poi-box',
  templateUrl: './poi-box.component.html',
  styleUrls: ['./poi-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PoiBoxComponent extends BaseBoxComponent<PoiBoxFeature> {
  @Input() data: PoiBoxFeature;
  @Output() clickEVT: EventEmitter<void> = new EventEmitter<void>();
}
