import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {LangService} from '@wm-core/localization/lang.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'wm-home-ugc',
  templateUrl: './home-ugc.component.html',
  styleUrls: ['./home-ugc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeUgcComponent implements OnDestroy {
  img = 'assets/images/profile/my-path.webp';

  private _langChangeSub: Subscription;

  constructor(private _langSvc: LangService, private _cdr: ChangeDetectorRef) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this._langChangeSub?.unsubscribe();
  }
}
