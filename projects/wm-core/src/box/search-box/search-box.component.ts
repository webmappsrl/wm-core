import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {SearchBoxBaseComponent} from './search-box-base.component';

@Component({
  standalone: false,
  selector: 'wm-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SearchBoxComponent extends SearchBoxBaseComponent {}
