import {Component, ViewEncapsulation, Input, ViewChild} from '@angular/core';
import {IonSlides} from '@ionic/angular';
import {Media} from '@wm-types/feature';
import {BehaviorSubject, from, merge, of} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {
  currentUgcPoiProperties,
  currentUgcTrackProperties,
} from '@wm-core/store/features/ugc/ugc.selector';

@Component({
  selector: 'wm-ugc-medias',
  templateUrl: './wm-ugc-medias.component.html',
  styleUrls: ['./wm-ugc-medias.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WmUgcMediasComponent {
  @Input() showArrows = false;
  @ViewChild('slider') slider: IonSlides;

  currentMedia$: BehaviorSubject<null | Media> = new BehaviorSubject<null | Media>(null);
  currentPoiProperties$ = this._store.select(currentUgcPoiProperties);
  currentTrackProperties$ = this._store.select(currentUgcTrackProperties);
  medias$: BehaviorSubject<null | Media[]> = new BehaviorSubject<null | Media[]>(null);
  showMedia$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  sliderOptions = {
    slidesPerView: 1,
    slidesPerColumn: 1,
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
    this.slider.slideNext();
    const index = await this.slider.getActiveIndex();
    this.currentMedia$.next(this.medias$.value[index]);
  }

  async prev(): Promise<void> {
    this.slider.slidePrev();
    const index = await this.slider.getActiveIndex();
    this.currentMedia$.next(this.medias$.value[index]);
  }

  async showMedia(media: Media) {
    this.currentMedia$.next(media);
    this.showMedia$.next(true);
  }
}
