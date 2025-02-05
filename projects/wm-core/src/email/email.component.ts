/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  selector: 'wm-email',
  template: `
            <ion-item
              *ngIf="email != null"
              href="mailto:{{email}}"
            >
              <i class="icon-outline-mail" slot="start"></i>
              <ion-label>{{email}}</ion-label>
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
export class WmEmailComponent {
  @Input() email: string;
}
