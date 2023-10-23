/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  selector: 'wm-email',
  template: `
            <div
              *ngIf="email != null"
              class="ripple-parent ion-activatable webmapp-pagepoi-info-reference"
            >
              <a href="mailto:{{email}}">
                <i class="icon-outline-mail webmapp-pagepoi-info-icon"></i>
                {{ email}}
                <ion-ripple-effect></ion-ripple-effect>
              </a>
            </div>
`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmEmailComponent {
  @Input() email: string;
}
