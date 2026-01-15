import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {ecLayer} from '@wm-core/store/user-activity/user-activity.selector';
import {Subscription} from 'rxjs';

@Component({
  standalone: false,
  selector: 'wm-home-layer',
  templateUrl: './home-layer.component.html',
  styleUrls: ['./home-layer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLayerComponent implements OnDestroy {
  layer$ = this._store.select(ecLayer);

  private _langChangeSub: Subscription;

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
  ) {
    this._langChangeSub = this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this._langChangeSub?.unsubscribe();
  }
}
