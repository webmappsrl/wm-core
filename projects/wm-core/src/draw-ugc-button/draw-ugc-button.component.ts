import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {DeviceService} from '@wm-core/services/device.service';
import {confShowDraw, confShowDrawPoi, confShowDrawTrack} from '@wm-core/store/conf/conf.selector';
import {
  drawTrackOpened as ActiondrawTrackOpened,
  startDrawUgcPoi,
  stopDrawUgcPoi,
} from '@wm-core/store/user-activity/user-activity.action';
import {
  drawOpened,
  drawPoiOpened,
  drawTrackOpened,
} from '@wm-core/store/user-activity/user-activity.selector';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {take} from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'wm-draw-ugc-button',
  templateUrl: './draw-ugc-button.component.html',
  styleUrls: ['./draw-ugc-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDrawUgcButtonComponent {
  drawTrackOpened$ = this._store.select(drawTrackOpened);
  drawPoiOpened$ = this._store.select(drawPoiOpened);
  drawOpened$ = this._store.select(drawOpened);
  showDrawPoi$ = this._store.select(confShowDrawPoi);
  showDrawTrack$ = this._store.select(confShowDrawTrack);
  showDraw$ = this._store.select(confShowDraw);
  showDrawTypeSelection$ = new BehaviorSubject<boolean>(false);

  constructor(private _store: Store, private _deviceSvc: DeviceService) {}

  toggleTypeSelection(): void {
    this.showDrawTypeSelection$.next(!this.showDrawTypeSelection$.value);
  }

  stopDrawing(): void {
    this.showDrawTypeSelection$.next(false);
    combineLatest([this.drawTrackOpened$, this.drawPoiOpened$])
      .pipe(take(1))
      .subscribe(([drawTrackOpened, drawPoiOpened]) => {
        if (drawTrackOpened) {
          this.toggleDrawTrackEnabled();
        } else if (drawPoiOpened) {
          this.toggleDrawPoiEnabled();
        }
      });
  }

  toggleDrawTrackEnabled(): void {
    this.showDrawTypeSelection$.next(false);
    this.drawTrackOpened$.pipe(take(1)).subscribe(drawTrackOpened => {
      this._store.dispatch(ActiondrawTrackOpened({drawTrackOpened: !drawTrackOpened}));
    });
  }

  toggleDrawPoiEnabled(): void {
    this.showDrawTypeSelection$.next(false);
    this.drawPoiOpened$.pipe(take(1)).subscribe(drawPoiOpened => {
      if (drawPoiOpened) {
        this._store.dispatch(stopDrawUgcPoi());
      } else {
        this._store.dispatch(startDrawUgcPoi({ugcPoi: null}));
      }
    });
  }
}
