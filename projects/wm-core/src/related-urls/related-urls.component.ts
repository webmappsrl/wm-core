/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  standalone: false,
  selector: 'wm-related-urls',
  template: `
    <ion-list *ngIf="relatedUrls != null">
      <ion-item *ngFor="let item of relatedUrls|keyvalue" (click)="url(item.value)" href="#">
          <i class="icon-outline-globe" slot="start"></i>
          <ion-label>{{item.key}}</ion-label>
      </ion-item>
    </ion-list>
`,
  styles: [`
    ion-list {
      padding: 0;
      ion-item {
        i{
          color: var(--wm-color-icon, var(--ion-color-primary));
        }
        ion-label {
          font-weight: 600;
          color: var(wm-feature-details-description-color), var(--wm-color-dark);
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmRelatedUrlsComponent {
  @Input('relatedUrls') relatedUrls: {[label: string]: string};

  url(url: string): void {
    url = url.replace(/^https?:\/\//, '');
    window.open(`https://${url}`, '_blank');
  }
}
