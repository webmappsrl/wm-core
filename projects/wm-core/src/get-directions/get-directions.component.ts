import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";
import {Store} from "@ngrx/store";
import {confOPTIONS} from "@wm-core/store/conf/conf.selector";
import {featureFirstCoordinates} from "@wm-core/store/features/features.selector";
import {IOPTIONS} from "@wm-core/types/config";
import {Observable} from "rxjs";

@Component({
  selector: 'wm-get-directions',
  template: `
    <ng-container *ngIf="confOPTIONS$|async as confOPTIONS">
      <ng-container *ngIf="confOPTIONS.showGetDirections">
        <ng-container *ngIf="coordinates$|async as coordinates">
          <ion-button color="light" mode="ios" expand="block" (click)="getDirections(coordinates)">
            <ion-icon src="assets/direction.svg"></ion-icon>
            <ion-label>{{'Ottieni indicazioni' | wmtrans}}</ion-label>
          </ion-button>
        </ng-container>
      </ng-container>
    </ng-container>
  `,
  styles: [
    `
      wm-get-directions {
        display: block;
        margin: var(--wm-feature-details-margin);
        ion-button {
          --box-shadow: none;
          --border-radius: 25px;
          ion-icon {
            margin-right: 12px;
          }
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class GetDirectionsComponent {
  coordinates$ = this._store.select(featureFirstCoordinates);
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);

  constructor(private _store: Store) {}

  getDirections(coordinates: number[]) {
    if (coordinates && coordinates.length >= 2) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}`;
      window.open(url, '_blank');
    }
  }
}
