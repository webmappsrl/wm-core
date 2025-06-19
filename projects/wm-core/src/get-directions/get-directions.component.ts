import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";
import {Store} from "@ngrx/store";
import {confOPTIONS} from "@wm-core/store/conf/conf.selector";
import {IOPTIONS} from "@wm-core/types/config";
import {Observable} from "rxjs";
import {startGetDirections} from "@wm-core/store/user-activity/user-activity.action";

@Component({
  selector: 'wm-get-directions',
  template: `
    <ng-container *ngIf="confOPTIONS$|async as confOPTIONS">
      <ng-container *ngIf="confOPTIONS.showGetDirections">
        <ion-button color="light" mode="ios" expand="block" (click)="startGetDirections()">
          <ion-icon src="assets/direction.svg"></ion-icon>
          <ion-label>{{'Ottieni indicazioni' | wmtrans}}</ion-label>
        </ion-button>
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
      ion-modal {
        --border-radius: 16px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class GetDirectionsComponent {
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);

  constructor(private _store: Store) {}

  startGetDirections() {
    this._store.dispatch(startGetDirections());
  }
}
