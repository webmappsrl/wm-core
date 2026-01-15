import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IUGCBOX} from '../../types/config';
import {openDownloads, openUgc} from '@wm-core/store/user-activity/user-activity.action';

@Component({
  standalone: false,
  selector: 'wm-downloads-ec-track-box',
  templateUrl: './downloads-ec-track-box.component.html',
  styleUrls: ['./downloads-ec-track-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DownloadsEcTrackBox extends BaseBoxComponent<IUGCBOX> {
  public defaultPhotoPath = 'assets/images/profile/downloads.webp';

  openDownloads(): void {
    this._store.dispatch(openDownloads());
  }
}
