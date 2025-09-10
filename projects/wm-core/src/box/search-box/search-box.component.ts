import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {Hit} from '@wm-types/elastic';
import {icons} from '@wm-core/store/icons/icons.selector';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SearchBoxComponent extends BaseBoxComponent<Hit> {
  icons$: Observable<{[key: string]: string}> = this._store.select(icons);
}
