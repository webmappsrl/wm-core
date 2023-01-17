import { ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { DeviceService } from 'src/app/services/base/device.service';
import { IGeojsonFeature } from 'src/app/types/model';

@Component({
  selector: 'webmapp-card-slider',
  templateUrl: './card-slider.component.html',
  styleUrls: ['./card-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CardSliderComponent implements OnInit {
  @Input('title') title: string;
  @Input('nodata') nodata: string;
  @Input('data') data: Array<IGeojsonFeature>;
  @Input('showDistance') showDistance: boolean;

  public sliderOptions: any;

  constructor(private _deviceService: DeviceService) {
    this.sliderOptions = {
      initialSlide: 0,
      speed: 400,
      spaceBetween: 10,
      slidesOffsetAfter: 15,
      slidesOffsetBefore: 15,
      slidesPerView: this._deviceService.width / 235,
    };
  }

  ngOnInit() {}
}
