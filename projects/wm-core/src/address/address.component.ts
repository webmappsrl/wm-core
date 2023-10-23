/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  selector: 'wm-address',
  template: `
            <div
            *ngIf="address != null"
              class="ripple-parent ion-activatable webmapp-pagepoi-info-reference"
            >
              <i class="icon-outline-pin webmapp-pagepoi-info-icon"></i>
              {{address}}
              <ion-ripple-effect></ion-ripple-effect>
            </div>
`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmAddressComponent {
  @Input() address: string;
}
