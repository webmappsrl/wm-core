import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import { DeviceService } from '@wm-core/services/device.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {featuresInViewport} from '@wm-core/store/user-activity/user-activity.selector';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'wm-features-in-viewport',
  templateUrl: './features-in-viewport.component.html',
  styleUrls: ['./features-in-viewport.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmFeaturesInViewportComponent {
  featuresInViewport$: Observable<any[]> = this._store.select(featuresInViewport);
  sliderOptions$: Observable<any>;

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService, private _deviceSvc: DeviceService) {
    this.sliderOptions$ = this.featuresInViewport$.pipe(
      map(features => this._getSliderOptions(features.length))
    );
  }

  setTrack(id: number): void {
    this._urlHandlerSvc.setTrack(id);
  }

  private _getSliderOptions(featureCount: number): any {
    const isSingleFeature = featureCount === 1;
    const isMobile = this._deviceSvc.isMobile;
    return {
      slidesPerView: isMobile ? 1.2 : 2.5,
      spaceBetween: isSingleFeature ? 0 : 8,
      slidesOffsetBefore: isSingleFeature ? 0 : 16,
      slidesOffsetAfter: isSingleFeature ? 0 : 16,
      centeredSlides: isSingleFeature,
      freeMode: true,
    };
  }
}
