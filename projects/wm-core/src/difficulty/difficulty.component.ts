import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {LangService} from '@wm-core/localization/lang.service';
import {BehaviorSubject} from 'rxjs';

export const MAX_DIFFICULTY = 3;
export const MIN_DIFFICULTY = 1;

@Component({
  selector: 'wm-difficulty',
  template: `
    <ng-container *ngIf="difficulty$|async as difficulty">
      <div *ngIf="isNumeric$|async; else isNotNumeric">
        <ng-container *ngFor="let i of createArray(+difficulty)">
          <span class="bullet fill"></span>
        </ng-container>
        <ng-container *ngFor="let i of createArray(maxDifficulty - +difficulty)">
          <span class="bullet"></span>
        </ng-container>
      </div>
      <ng-template #isNotNumeric>
        <div>{{difficulty}}</div>
      </ng-template>
    </ng-container>
  `,
  styles: [
    `
      wm-difficulty {
        > div {
          height: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          font-weight: 700;
          color: var(--ion-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          .bullet {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid var(--wm-color-primary);

            &.fill {
              background-color: var(--wm-color-primary);
            }
          }
        }
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmDifficultyComponent {
  maxDifficulty = MAX_DIFFICULTY;
  isNumeric$ = new BehaviorSubject<boolean>(false);
  difficulty$ = new BehaviorSubject<number | string>(null);

  @Input() set difficulty(value) {
    value = this._langSvc.instant(value);
    if (!isNaN(value)) {
      if (value < MIN_DIFFICULTY) {
        value = MIN_DIFFICULTY;
      } else if (value > MAX_DIFFICULTY) {
        value = MAX_DIFFICULTY;
      }
      this.isNumeric$.next(true);
    } else {
      this.isNumeric$.next(false);
    }
    this.difficulty$.next(value);
  }

  constructor(private _langSvc: LangService) {}

  createArray(length: number): number[] {
    return Array.from({ length }, (_, i) => i);
  }
}
