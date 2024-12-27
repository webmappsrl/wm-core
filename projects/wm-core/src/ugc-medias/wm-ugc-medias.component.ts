import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  Input,
  ViewChild,
} from '@angular/core';
import {IonSlides} from '@ionic/angular';
import {MediaProperties, WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-ugc-medias',
  templateUrl: './wm-ugc-medias.component.html',
  styleUrls: ['./wm-ugc-medias.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmUgcMediasComponent {
  @Input() set medias(medias: WmFeature<Point, MediaProperties>[]) {
    this.medias$.next(medias);
  }

  @Input() showArrows = false;
  @ViewChild('slider') slider: IonSlides;

  currentMedia$: BehaviorSubject<null | WmFeature<Point, MediaProperties>> =
    new BehaviorSubject<null | WmFeature<Point, MediaProperties>>(null);
  medias$: BehaviorSubject<null | WmFeature<Point, MediaProperties>[]> = new BehaviorSubject<
    null | WmFeature<Point, MediaProperties>[]
  >(null);
  showMedia$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  sliderOptions = {
    slidesPerView: 1,
    slidesPerColumn: 1,
    slidesPerGroup: 1,
    centeredSlides: true,
    watchSlidesProgress: true,
    spaceBetween: 20,
  };

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

  showMedia(media: WmFeature<Point, MediaProperties>): void {
    this.currentMedia$.next(media);
    this.showMedia$.next(true);
  }
}
