import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {icons} from '@wm-core/store/icons/icons.selector';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-poi-types-badges',
  template: `
    <ng-container *ngIf="poiTypes as poiTypes">
      <div *ngFor="let poiType of poiTypes">
        <ng-container *ngIf="icons$ | async as icons">
          <div appBuildSvg *ngIf="icons?.[poiType.icon_name] as svgIcon" [svg]="svgIcon"></div>
        </ng-container>
        <span>{{poiType.name | wmtrans}}</span>
      </div>
    </ng-container>
  `,
  styles: [
    `
      wm-poi-types-badges {
        position: relative;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px;
        margin: var(--wm-feature-details-margin);

        > div {
          display: flex;
          flex-direction: row;
          border: 1px solid var(--wm-color-medium);
          border-radius: 24px;
          padding: 4px 8px;
          color: var(--wm-color-medium);
          align-items: center;

          div {
            display: flex;
          }

          svg {
            width: 20px;
            height: 20px;
            margin-right: 8px;

            circle {
              fill: var(--wm-color-medium);
            }
          }

          span {
            color: var(--wm-color-medium);
            font-size: 14px;
            font-weight: 600;
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PoiTypesBadgesComponent {
  @Input() poiTypes: any;
  icons$: Observable<{[key: string]: string}> = this._store.select(icons);

  constructor(private _sanitizer: DomSanitizer, private _store: Store) {}

  sanitize(html: string) {
    return this._sanitizer.bypassSecurityTrustHtml(html);
  }
}
