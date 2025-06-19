import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";
import {Store} from "@ngrx/store";
import {ModalController} from "@ionic/angular";

@Component({
  selector: 'wm-modal-get-directions',
  template: `
    <ion-content>
      <ion-label>{{"Ottieni le indicazioni su Google Maps" | wmtrans}}</ion-label>
      <ion-list lines="none">
        <ion-item>
          <ion-button mode="ios"color="light" expand="block" (click)="getDirections('start')">
            <ion-icon name="flag-outline"></ion-icon>
            {{"Per il punto di partenza" | wmtrans}}
          </ion-button>
        </ion-item>
        <ion-item>
          <ion-button mode="ios" color="light" expand="block" (click)="getDirections('nearest')">
            <ion-icon name="pin-outline"></ion-icon>
            {{"Per il punto più vicino in linea d'aria" | wmtrans}}
          </ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      wm-modal-get-directions {
        ion-label {
          display: block;
          text-align: center;
          margin: 16px;
          padding-top: 10px;
        }
        ion-list {
          ion-item {
            ion-button {
              width: 100%;
              height: 45px;
              text-transform: none;
              font-size: 14px;
              margin-bottom: 16px;
              --box-shadow: none;
              --border-radius: 25px;

              ion-icon {
                margin-right: 12px;
              }
            }
          }
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ModalGetDirectionsComponent {
  constructor(private _store: Store, private _modalController: ModalController) {}

  getDirections(type: 'start' | 'nearest') {
    this._modalController.dismiss(type);
  }
}
