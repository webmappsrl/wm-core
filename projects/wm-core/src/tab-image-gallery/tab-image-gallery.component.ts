import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  standalone: false,
  selector: 'wm-tab-image-gallery',
  templateUrl: './tab-image-gallery.component.html',
  styleUrls: ['./tab-image-gallery.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabImageGalleryComponent {
  @Input() imageGallery;

  public sliderOptions: any = {
    slidesPerView: 1.3,
  };

  constructor() {}
}
