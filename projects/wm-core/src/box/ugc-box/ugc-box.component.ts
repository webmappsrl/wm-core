import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IUGCBOX} from '../../types/config';

@Component({
  selector: 'wm-ugc-box',
  templateUrl: './ugc-box.component.html',
  styleUrls: ['./ugc-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcBoxComponent extends BaseBoxComponent<IUGCBOX> {
  public defaultPhotoPath = 'assets/images/profile/my-path.webp';
}
