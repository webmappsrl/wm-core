import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {WmProperties} from '@wm-types/feature';
import {Store} from '@ngrx/store';
import {icons} from '@wm-core/store/icons/icons.selector';
import {ICONS} from '@wm-types/config';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-tab-howto',
  templateUrl: './tab-howto.component.html',
  styleUrls: ['./tab-howto.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmTabHowtoComponent {
  @Input()
  set form(form: any) {
    this.properties = {...this.properties, ...{identifier: form.activity, label: form.title}};
  }
  @Input() properties: WmProperties;

  icons$: Observable<ICONS> = this._store.select(icons);

  constructor(private _store: Store) {}
}
