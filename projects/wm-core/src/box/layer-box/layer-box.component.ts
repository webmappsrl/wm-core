import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Optional,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BaseBoxComponent} from '../box';
import {ILAYERBOX} from '../../types/config';
import {LangService} from '@wm-core/localization/lang.service';
import {POSTHOG_CLIENT} from '@wm-core/store/conf/conf.token';
import {WmPosthogClient} from '@wm-types/posthog';

@Component({
  standalone: false,
  selector: 'wm-layer-box',
  templateUrl: './layer-box.component.html',
  styleUrls: ['./layer-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LayerBoxComponent extends BaseBoxComponent<ILAYERBOX> {
  constructor(
    langSvc: LangService,
    cdr: ChangeDetectorRef,
    store: Store,
    @Optional() @Inject(POSTHOG_CLIENT) private _posthogClient?: WmPosthogClient,
  ) {
    super(langSvc, cdr, store);
  }

  onClick(): void {
    if (this._posthogClient && this.data?.layer) {
      const layerId = `${this.data.layer.id}`;
      const layerName = this.data.layer.title ?? this.data.title ?? '';
      this._posthogClient.capture('layerOpened', {
        layer_id: layerId,
        layer_name: layerName,
        layer_label: `${layerId} - ${layerName}`,
      });
    }
    this.clickEVT.emit();
  }
}
