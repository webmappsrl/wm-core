import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {LangService} from '@wm-core/localization/lang.service';

@Component({
  selector: 'wm-home-ugc',
  templateUrl: './home-ugc.component.html',
  styleUrls: ['./home-ugc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeUgcComponent {
  img = 'assets/images/profile/my-path.webp';

  constructor(private _langSvc: LangService, private _cdr: ChangeDetectorRef) {
    this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }
}
