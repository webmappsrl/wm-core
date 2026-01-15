/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  standalone: false,
  selector: 'wm-phone',
  template: `
            <ion-item
              *ngIf="phone != null"
              href="tel:{{phone}}"
            >
              <i class="icon-outline-phone" slot="start"></i>
              <ion-label>{{phone}}</ion-label>
            </ion-item>
`,
styles: [`
  ion-item {
    padding: 0;
    i{
      color: var(--wm-color-icon, var(--ion-color-primary));
    }
    ion-label {
      font-weight: 600;
      color: var(wm-feature-details-description-color), var(--wm-color-dark);
    }
  }
`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmPhoneComponent {
  @Input() phone: string;
}
