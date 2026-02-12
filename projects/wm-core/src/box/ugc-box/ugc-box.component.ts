import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IUGCBOX} from '../../types/config';
import {openUgcUploader} from '@wm-core/store/user-activity/user-activity.action';
import {combineLatest, Observable} from 'rxjs';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {isLogged, needsPrivacyAgree} from '@wm-core/store/auth/auth.selectors';
import { map } from 'rxjs/operators';

@Component({
  selector: 'wm-ugc-box',
  templateUrl: './ugc-box.component.html',
  styleUrls: ['./ugc-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcBoxComponent extends BaseBoxComponent<IUGCBOX> {
  public defaultPhotoPath = 'assets/images/profile/my-path.webp';
  isLogged$: Observable<boolean> = this._store.select(isLogged);
  ugcOpen$: Observable<boolean> = this._store.select(ugcOpened);
  showUgcUploaderButton$: Observable<boolean> = combineLatest([this.isLogged$, this.ugcOpen$]).pipe(
    map(([isLogged, ugcOpen]) => isLogged && ugcOpen),
  );
  needsPrivacyAgree$: Observable<boolean> = this._store.select(needsPrivacyAgree);
  showPrivacyAgreeButton$: Observable<boolean> = combineLatest([this.ugcOpen$, this.needsPrivacyAgree$]).pipe(
    map(([ugcOpen, needsPrivacyAgree]) => ugcOpen && needsPrivacyAgree),
  );

  openUgcUploader() {
    this._store.dispatch(openUgcUploader());
  }
}
