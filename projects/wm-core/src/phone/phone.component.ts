/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  selector: 'wm-phone',
  template: `
            <div
              *ngIf="phone != null"
              class="ripple-parent ion-activatable webmapp-pagepoi-info-reference"
            >
              <a href="tel:{{phone}}">
                <i class="icon-outline-phone webmapp-pagepoi-info-icon"></i>
                {{phone}}</a
              >
              <ion-ripple-effect></ion-ripple-effect>
            </div>
`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmPhoneComponent {
  @Input() phone: string;
}
