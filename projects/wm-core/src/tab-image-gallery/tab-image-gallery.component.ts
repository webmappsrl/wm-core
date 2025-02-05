import {Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'wm-tab-image-gallery',
  templateUrl: './tab-image-gallery.component.html',
  styleUrls: ['./tab-image-gallery.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TabImageGalleryComponent {
  @Input() imageGallery;

  public sliderOptions: any = {
    slidesPerView: 1.3,
  };

  constructor() {}
}
