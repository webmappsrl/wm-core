import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {UgcBoxBaseComponent} from './ugc-box-base.component';

@Component({
  standalone: false,
  selector: 'wm-ugc-box',
  templateUrl: './ugc-box.component.html',
  styleUrls: ['./ugc-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcBoxComponent extends UgcBoxBaseComponent {}
