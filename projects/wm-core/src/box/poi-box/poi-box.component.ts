import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

import {BaseBoxComponent} from '../box';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {icons} from '@wm-core/store/icons/icons.selector';
import {Observable} from 'rxjs';

@Component({
  standalone: false,
  selector: 'wm-poi-box',
  templateUrl: './poi-box.component.html',
  styleUrls: ['./poi-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PoiBoxComponent extends BaseBoxComponent<WmFeature<Point>> {
  icons$: Observable<{[key: string]: string}> = this._store.select(icons);
}
