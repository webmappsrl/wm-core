import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {DeviceService} from 'src/app/services/base/device.service';
import {IBASEBOX} from 'src/app/types/config';
import {BaseBoxComponent} from '../box';

@Component({
  selector: 'wm-slider-box',
  templateUrl: './slider-box.component.html',
  styleUrls: ['./slider-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SliderBoxComponent extends BaseBoxComponent<IBASEBOX> {
  @Output() public clickEVT: EventEmitter<number> = new EventEmitter<number>();

  public sliderOptions: any;

  constructor(private _deviceService: DeviceService) {
    super();
    this.sliderOptions = {
      initialSlide: 0,
      speed: 400,
      spaceBetween: 10,
      slidesOffsetAfter: 15,
      slidesOffsetBefore: 15,
      slidesPerView: this._deviceService.width / 235,
    };
  }

  open(id: number): void {
    this.clickEVT.emit(id);
  }
}
