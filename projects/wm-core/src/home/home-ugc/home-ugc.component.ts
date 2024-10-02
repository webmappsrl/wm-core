import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import { LangService } from 'wm-core/localization/lang.service';
import {isUgcHome} from '../../store/api/api.selector';

@Component({
  selector: 'wm-home-ugc',
  templateUrl: './home-ugc.component.html',
  styleUrls: ['./home-ugc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeUgcComponent {
  isUgcSelected$ = this._store.select(isUgcHome);

  constructor(private _store: Store,private _langSvc:LangService,private _cdr:ChangeDetectorRef) {
    this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }
}
