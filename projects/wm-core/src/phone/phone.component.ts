/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

import {splitPhones, telHref} from './split-phones';

@Component({
  standalone: false,
  selector: 'wm-phone',
  template: `
    <ng-container *ngFor="let label of phoneLabels">
      <ion-item [href]="'tel:' + telHref(label)">
        <i class="icon-outline-phone" slot="start"></i>
        <ion-label>{{label}}</ion-label>
      </ion-item>
    </ng-container>
  `,
  styles: [
    `
      ion-item {
        padding: 0;
        i {
          color: var(--wm-color-icon, var(--ion-color-primary));
        }
        ion-label {
          font-weight: 600;
          color: var(wm-feature-details-description-color), var(--wm-color-dark);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmPhoneComponent {
  phoneLabels: string[] = [];

  /**
   * CSV `contact_phone` string; rendered as one `ion-item` per number.
   */
  @Input() set phone(value: string | null | undefined) {
    this.phoneLabels = splitPhones(value);
  }

  /**
   * Exposes `telHref` to the template.
   */
  telHref(label: string): string {
    return telHref(label);
  }
}
