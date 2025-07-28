import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
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

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {
    this.sliderOptions$ = this.featuresInViewport$.pipe(
      map(features => {
        if (features.length === 1) {
          return {
            slidesPerView: 1.2,
            spaceBetween: 0,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            centeredSlides: true,
            freeMode: true,
          };
        } else {
          return {
            slidesPerView: 1.2,
            spaceBetween: 16,
            slidesOffsetBefore: 16,
            slidesOffsetAfter: 16,
            centeredSlides: false,
            freeMode: true,
          };
        }
      })
    );
  }

  setTrack(id: number): void {
    this._urlHandlerSvc.setTrack(id);
  }
}
