import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IHIT} from '../../types/elastic';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SearchBoxComponent extends BaseBoxComponent<IHIT> {
  ugcOpened$: Observable<boolean> = this._store.select(ugcOpened);
}
