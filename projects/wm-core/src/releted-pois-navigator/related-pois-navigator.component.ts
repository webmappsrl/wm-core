import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import { UrlHandlerService } from '@wm-core/services/url-handler.service';
import {
  currentRelatedPoiIndex,
  currentRelatedPoisCount,
  nextRelatedPoiId,
  prevRelatedPoiId,
} from '@wm-core/store/features/ec/ec.selector';
import { setCurrentRelatedPoi } from '@wm-core/store/user-activity/user-activity.action';
import {filter, map, take} from 'rxjs/operators';

@Component({
  selector: 'wm-related-pois-navigator',
  template: `
    <ng-container *ngIf="currentRelatedPoisCount$|async as currentRelatedPoisCount">
      <ng-container *ngIf="currentRelatedPoiIndex$|async as currentRelatedPoiIndex">
        <ng-container *ngIf="currentRelatedPoisCount > 1">
          <ion-button
            shape="round"
            slot="icon-only"
            color="light"
            (click)="poiPrev()"
            [class.disabled]="currentRelatedPoiIndex == 1"
          >
            <ion-icon name="arrow-back-outline"></ion-icon>
          </ion-button>
          <span>
            {{currentRelatedPoiIndex}} di {{currentRelatedPoisCount}}
          </span>
          <ion-button
            shape="round"
            slot="icon-only"
            color="light"
            (click)="poiNext()"
            [class.disabled]="currentRelatedPoiIndex == currentRelatedPoisCount"
          >
            <ion-icon name="arrow-forward-outline"></ion-icon>
          </ion-button>
        </ng-container>
      </ng-container>
    </ng-container>
  `,
  styles: [`
    wm-related-pois-navigator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;

      ion-button {
        height: 28px;
        width: 28px;
        --padding-start: 0;
        --padding-end: 0;
        --box-shadow: none;

        &.disabled {
          opacity: 0;
          pointer-events: none;
        }
      }

      span {
        font-size: var(--wm-font-sm);
        font-weight: 400;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmRelatedPoisNavigatorComponent {
  currentRelatedPoisCount$ = this._store.select(currentRelatedPoisCount);
  currentRelatedPoiIndex$ = this._store.select(currentRelatedPoiIndex).pipe(filter(index => index != null), map(index => index+1));
  nextRelatedPoiId$ = this._store.select(nextRelatedPoiId);
  prevRelatedPoiId$ = this._store.select(prevRelatedPoiId);

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {}

  poiNext(): void {
    this.nextRelatedPoiId$.pipe(take(1)).subscribe(id => {
      if(id != null) {
        this._urlHandlerSvc.updateURL({ec_related_poi: id});
      }
    });
  }

  poiPrev(): void {
    this.prevRelatedPoiId$.pipe(take(1)).subscribe(id => {
      if(id != null) {
        this._urlHandlerSvc.updateURL({ec_related_poi: id});
      }
    });
  }
}
