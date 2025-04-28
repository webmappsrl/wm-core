import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {featuresInViewport} from '@wm-core/store/user-activity/user-activity.selector';
import {Observable} from 'rxjs';

@Component({
  selector: 'wm-features-in-viewport',
  templateUrl: './features-in-viewport.component.html',
  styleUrls: ['./features-in-viewport.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmFeaturesInViewportComponent {
  featuresInViewport$: Observable<any[]> = this._store.select(featuresInViewport);
  sliderOptions: any = {
    slidesPerView: 1.2,
    spaceBetween: 16,
    slidesOffsetBefore: 16,
    slidesOffsetAfter: 16,
    freeMode: true,
  };

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {}

  setTrack(id: number): void {
    this._urlHandlerSvc.setTrack(id);
  }
}
