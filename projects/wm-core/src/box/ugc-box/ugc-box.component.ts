import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IUGCBOX} from '../../types/config';
import {openUgcUploader} from '@wm-core/store/user-activity/user-activity.action';
import {Observable} from 'rxjs';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';

@Component({
  selector: 'wm-ugc-box',
  templateUrl: './ugc-box.component.html',
  styleUrls: ['./ugc-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcBoxComponent extends BaseBoxComponent<IUGCBOX> {
  public defaultPhotoPath = 'assets/images/profile/my-path.webp';
  ugcOpen$: Observable<boolean> = this._store.select(ugcOpened);
  needsPrivacyAgree$: Observable<boolean> = this._store.select(needsPrivacyAgree);

  openUgcUploader() {
    this._store.dispatch(openUgcUploader());
  }
}
