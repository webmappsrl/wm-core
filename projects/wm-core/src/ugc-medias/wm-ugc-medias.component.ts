import {Component, ViewEncapsulation, Input, ViewChild, ElementRef} from '@angular/core';
import {} from '@ionic/angular';
import {Media, WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {BehaviorSubject, from, merge, of} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {
  currentUgcPoiProperties,
  currentUgcTrackProperties,
} from '@wm-core/store/features/ugc/ugc.selector';

@Component({
  standalone: false,
  selector: 'wm-ugc-medias',
  templateUrl: './wm-ugc-medias.component.html',
  styleUrls: ['./wm-ugc-medias.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WmUgcMediasComponent {
  @Input() showArrows = false;
  @ViewChild('slider', {read: ElementRef}) slider: ElementRef;

  currentMedia$: BehaviorSubject<null | Media> = new BehaviorSubject<null | Media>(null);
  currentPoiProperties$ = this._store.select(currentUgcPoiProperties);
  currentTrackProperties$ = this._store.select(currentUgcTrackProperties);
  medias$: BehaviorSubject<null | Media[]> = new BehaviorSubject<null | Media[]>(null);
  showMedia$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  sliderOptions = {
    slidesPerView: 1,
    slidesPerGroup: 1,
    centeredSlides: true,
    watchSlidesProgress: true,
    spaceBetween: 20,
  };

  constructor(private _store: Store) {
    merge(this.currentPoiProperties$, this.currentTrackProperties$)
      .pipe(
        filter(properties => properties != null),
        switchMap(properties => {
          if (properties?.media && properties.media.length > 0) {
            return of(properties.media);
          }

          return of(null);
        }),
      )
      .subscribe(medias => {
        this.medias$.next(medias);
      });
  }

  close(): void {
    this.showMedia$.next(false);
    this.currentMedia$.next(null);
  }

  async next(): Promise<void> {
    const swiper = this.slider?.nativeElement?.swiper;
    if (swiper) {
      swiper.slideNext();
      this.currentMedia$.next(this.medias$.value[swiper.activeIndex]);
    }
  }

  async prev(): Promise<void> {
    const swiper = this.slider?.nativeElement?.swiper;
    if (swiper) {
      swiper.slidePrev();
      this.currentMedia$.next(this.medias$.value[swiper.activeIndex]);
    }
  }

  async showMedia(media: Media) {
    this.currentMedia$.next(media);
    this.showMedia$.next(true);
  }
}
