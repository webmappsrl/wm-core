import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent} from '../box';
import {IHIT} from '../../types/elastic';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';

@Component({
  selector: 'wm-poi-box',
  templateUrl: './poi-box.component.html',
  styleUrls: ['./poi-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PoiBoxComponent extends BaseBoxComponent<WmFeature<Point>> {}
