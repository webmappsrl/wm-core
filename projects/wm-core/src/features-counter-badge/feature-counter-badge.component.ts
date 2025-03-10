import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'wm-features-counter-badge',
  template: `
    <div>
      <div
        *ngIf="countEcTracks > 0"
      >
        <span>{{countEcTracks}}</span>
        <span>{{(countEcTracks > 1 ? 'Percorsi' : 'Percorso')|wmtrans}}</span>
      </div>
      <div
        *ngIf="countEcPoi > 0"
      >
        <span>{{countEcPoi}}</span>
        <span>{{(countEcPoi > 1 ? 'Luoghi' : 'Luogo')|wmtrans}}</span>
      </div>
    </div>
  `,
  styles: [`
    wm-features-counter-badge{
      background-color: #fff;
      position: absolute;
      top: 16px;
      right: 16px;
      border-radius: 15px;
      >div{
        display: flex;
        flex-direction: row;
        align-items: center;
        >div{
          position: relative;
          padding: 6px 10px;
          font-size: 12px;
          span:first-child{
            font-weight: bold;
            margin-right: 4px;
          }
        }
        >div:not(:first-child)::before{
          position: absolute;
          left: 0;
          content: '';
          width: 1px;
          height: calc(100% - 12px);
          background-color: #000;
        }
      }
    }
    `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmFeaturesCounterBadgeComponent {
  @Input() countEcPoi: number;
  @Input() countEcTracks: number;
}
