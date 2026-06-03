import {Component, Input, ViewEncapsulation} from '@angular/core';
import {ChangeDetectionStrategy} from '@angular/core';
import {WmProperties} from '@wm-types/feature';

@Component({
  selector: 'wm-ugc-synchronized-badge',
  standalone: false,
  template: `
    <ng-container *ngIf="properties?.id; else onlyUuid">
      <ion-icon name="cloud-done-outline"></ion-icon>
    </ng-container>
    <ng-template #onlyUuid>
      <ion-icon name="cloud-offline-outline"></ion-icon>
    </ng-template>
  `,
  styles: [
    `
      wm-ugc-synchronized-badge {
        ion-icon {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          padding: 3px;
          background-color: #fff;
          &[name='cloud-done-outline'] {
            color: #04ae04;
          }
          &[name='cloud-offline-outline'] {
            color: #ed143d;
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcSynchronizedBadgeComponent {
  @Input() properties: {[name: string]: any} | WmProperties;
}
