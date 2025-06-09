import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {DeviceService} from '@wm-core/services/device.service';
import {isLogged} from '@wm-core/store/auth/auth.selectors';
import {
  confAUTHEnable,
  confShowDraw,
  confShowDrawPoi,
  confShowDrawTrack,
} from '@wm-core/store/conf/conf.selector';
import {
  drawTrackOpened as ActiondrawTrackOpened,
  openLoginModal,
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
  selector: 'wm-draw-ugc-button',
  templateUrl: './draw-ugc-button.component.html',
  styleUrls: ['./draw-ugc-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDrawUgcButtonComponent {
  authEnable$ = this._store.select(confAUTHEnable);
  isLogged$ = this._store.select(isLogged);
  drawTrackOpened$ = this._store.select(drawTrackOpened);
  drawPoiOpened$ = this._store.select(drawPoiOpened);
  drawOpened$ = this._store.select(drawOpened);
  showDrawPoi$ = this._store.select(confShowDrawPoi);
  showDrawTrack$ = this._store.select(confShowDrawTrack);
  showDraw$ = this._store.select(confShowDraw);
  showDrawTypeSelection$ = new BehaviorSubject<boolean>(false);

  constructor(private _store: Store, private _deviceSvc: DeviceService) {}

  toggleTypeSelection() {
    this.showDrawTypeSelection$.next(!this.showDrawTypeSelection$.value);
  }

  stopDrawing() {
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
    combineLatest([this.authEnable$, this.isLogged$, this.drawTrackOpened$])
      .pipe(take(1))
      .subscribe(([authEnabled, isLogged, drawTrackOpened]) => {
        this._handleAuthFlow(authEnabled, isLogged, () => {
          this._store.dispatch(ActiondrawTrackOpened({drawTrackOpened: !drawTrackOpened}));
        });
      });
  }

  toggleDrawPoiEnabled(): void {
    this.showDrawTypeSelection$.next(false);
    combineLatest([this.authEnable$, this.isLogged$, this.drawPoiOpened$])
      .pipe(take(1))
      .subscribe(([authEnabled, isLogged, drawPoiOpened]) => {
        this._handleAuthFlow(authEnabled, isLogged, () => {
          if (drawPoiOpened) {
            this._store.dispatch(stopDrawUgcPoi());
          } else {
            this._store.dispatch(startDrawUgcPoi({ugcPoi: null}));
          }
        });
      });
  }

  private _handleAuthFlow(authEnabled: boolean, isLogged: boolean, action: () => void): void {
    if (authEnabled && !isLogged) {
      this._store.dispatch(openLoginModal());
    } else {
      action();
    }
  }
}
