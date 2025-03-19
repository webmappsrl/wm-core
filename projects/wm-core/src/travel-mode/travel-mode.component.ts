import {ChangeDetectionStrategy, Component, ViewEncapsulation} from "@angular/core";
import {Store} from "@ngrx/store";
import {currentEcTrackProperties} from "@wm-core/store/features/ec/ec.selector";
import {BehaviorSubject} from "rxjs";
import {tap} from "rxjs/operators";

@Component({
  selector: 'wm-travel-mode',
  template: `
  <ng-container *ngIf="ecTrackProperties$|async as ecTrackProperties">
    <ion-label>Modalità di percorrenza</ion-label>
    <ion-segment value="walk" mode="ios" (ionChange)="onTravelModeChange($event)">
      <ion-segment-button value="walk">
        <ion-icon name="walk-outline"></ion-icon>
      </ion-segment-button>
      <ion-segment-button value="bike">
        <ion-icon name="bicycle-outline"></ion-icon>
      </ion-segment-button>
    </ion-segment>
    <ion-grid>
      <ion-row>
        <ion-col>
          <div class="to-delete">●○○</div>
          <div>{{'Difficoltà'|wmtrans}}</div>
        </ion-col>
        <ion-col>
          <div [innerHTML]="ecTrackProperties?.distance|distance:'km':1:'html'"></div>
          <div>{{'Lunghezza'|wmtrans}}</div>
        </ion-col>
        <ion-col>
          <div [innerHTML]="durention$|async|duration:'html'"></div>
          <div>{{'Orario previsto'|wmtrans}}</div>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ng-container>
  `,
  styles: [
    `
      wm-travel-mode {
        display: block;
        margin: var(--wm-feature-details-margin);

        ion-label{
          font-size: var(--wm-feature-details-title-font-size);
          font-weight: var(--wm-feature-details-title-font-weight);
          color: var(--wm-feature-details-title-color);
          font-family: var(--wm-feature-details-title-font-family);
        }

        ion-segment{
          padding: 4px;
          border-radius: 25px;
          margin: 10px 0px;
          ion-segment-button{
            --border-radius: 25px;
            height: 36px;
            &.segment-button-checked{
              ion-icon{
                color: var(--wm-color-primary);
              }
            }
          }
        }

        ion-grid{
          ion-row{
            ion-col{
              display: flex;
              flex-direction: column;
              div:first-child{
                font-size: 22px;
                font-weight: 700;
                color: var(--ion-text-color);
                .unit{
                  font-size: 14px;
                }
                &.to-delete{
                  color: var(--wm-color-primary);
                  font-size: 44px;
                  line-height: 33px;
                }
              }
              div:last-child{
                font-size: 14px;
                font-weight: 400;
                color: var(--ion-text-color);
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
export class TravelModeComponent {
  private _originalDuration: number;

  durention$: BehaviorSubject<number> = new BehaviorSubject(null);
  ecTrackProperties$ = this._store.select(currentEcTrackProperties).pipe(
    tap((ecTrackProperties) => {
      this._originalDuration = ecTrackProperties?.duration_forward ?? 0;
      this.durention$.next(this._originalDuration);
    })
  );

  constructor(private _store: Store) {}

  onTravelModeChange(event: any) {
    const mode = event?.detail?.value;
    if (mode === 'bike') {
        this.durention$.next(this._originalDuration * 0.33);
    } else {
      this.durention$.next(this._originalDuration);
    }
  }
}
