/* eslint-disable @angular-eslint/template/eqeqeq */
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
@Component({
  selector: 'wm-related-urls',
  template: `
    <div *ngIf="relatedUrls != null" 
      class="ripple-parent ion-activatable webmapp-pagepoi-info-reference"
    >
        <ng-container *ngFor="let item of relatedUrls|keyvalue">
            <a  style="display:block"  (click)="url(item.value)">
                <i class="icon-outline-globe webmapp-pagepoi-info-icon"></i>
                {{item.key}}
            </a>
        </ng-container>
    </div>
`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmRelatedUrlsComponent {
  @Input('relatedUrls') relatedUrls: {[label: string]: string};

  url(url: string): void {
    url = url.replace(/^https?:\/\//, '');
    window.open(`https://${url}`, '_blank');
  }
}
