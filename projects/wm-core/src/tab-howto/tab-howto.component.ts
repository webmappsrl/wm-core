import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {IGeojsonProperties} from '@wm-core/types/model';
import {WmProperties} from '@wm-types/feature';

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

  constructor() {}
}
