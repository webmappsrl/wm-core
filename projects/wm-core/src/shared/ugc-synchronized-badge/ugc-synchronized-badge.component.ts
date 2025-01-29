import {Component, Input, ViewEncapsulation} from '@angular/core';
import {ChangeDetectionStrategy} from '@angular/core';
import {WmProperties} from '@wm-types/feature';

@Component({
  selector: 'wm-ugc-synchronized-badge',
  template: `
    <ng-container *ngIf="properties?.id; else onlyUuid">
      <ion-icon name="cloud-done-outline" color="primary"></ion-icon>
    </ng-container>
    <ng-template #onlyUuid>
      <ion-icon name="cloud-offline-outline" color="danger"></ion-icon>
    </ng-template>
  `,
  styles: [
    `
      wm-ugc-synchronized-badge {
        ion-icon {
          width: 22px;
          height: 22px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcSynchronizedBadgeComponent {
  @Input() properties: { [name: string]: any; } | WmProperties;
}
