import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {apiElasticStateLayer} from '../../store/api/api.selector';

@Component({
  selector: 'wm-home-layer',
  templateUrl: './home-layer.component.html',
  styleUrls: ['./home-layer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeLayerComponent {
  layer$ = this._store.select(apiElasticStateLayer);

  constructor(
    private _store: Store,
    private _langSvc: LangService,
    private _cdr: ChangeDetectorRef,
  ) {
    this._langSvc.onLangChange.subscribe(() => {
      this._cdr.markForCheck();
    });
  }
}
