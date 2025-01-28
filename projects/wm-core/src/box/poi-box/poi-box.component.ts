import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent} from '../box';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';

@Component({
  selector: 'wm-poi-box',
  templateUrl: './poi-box.component.html',
  styleUrls: ['./poi-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PoiBoxComponent extends BaseBoxComponent<WmFeature<Point>> {
  ugcOpened$ = this._store.select(ugcOpened);
}
