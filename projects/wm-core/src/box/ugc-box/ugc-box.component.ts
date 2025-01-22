import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  ChangeDetectorRef,
} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IUGCBOX} from '../../types/config';
import {Store} from '@ngrx/store';
import {openUgcUploader} from '@wm-core/store/user-activity/user-activity.action';
import {LangService} from '@wm-core/localization/lang.service';

@Component({
  selector: 'wm-ugc-box',
  templateUrl: './ugc-box.component.html',
  styleUrls: ['./ugc-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcBoxComponent extends BaseBoxComponent<IUGCBOX> {
  public defaultPhotoPath = 'assets/images/profile/my-path.webp';

  openUgcUploader() {
    this._store.dispatch(openUgcUploader());
  }
}
