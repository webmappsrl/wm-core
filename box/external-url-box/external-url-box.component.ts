import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';

@Component({
  selector: 'webmapp-external-url-box',
  templateUrl: './external-url-box.component.html',
  styleUrls: ['./external-url-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ExternalUrlBoxComponent extends BaseBoxComponent<any> {
  openUrl() {
    window.open(this.data.url, '_blank');
  }
}
