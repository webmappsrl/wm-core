/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  selector: 'wm-elevation',
  template: `
            <div
              *ngIf="elevation != null"
              class="ripple-parent ion-activatable webmapp-pagepoi-info-reference"
            >
              <a>
                <i class="icon-outline-plus webmapp-pagepoi-info-icon"></i>
                {{elevation}} {{'metri'|wmtrans}}</a
              >
              <ion-ripple-effect></ion-ripple-effect>
            </div>
`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmElevationComponent {
  @Input() elevation: number;
}
