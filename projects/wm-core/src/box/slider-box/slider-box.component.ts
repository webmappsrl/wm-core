import {Observable, of} from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {BaseBoxComponent} from '../box';
import { IBASEBOX } from '../../types/config';

@Component({
  selector: 'wm-slider-box',
  templateUrl: './slider-box.component.html',
  styleUrls: ['./slider-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SliderBoxComponent extends BaseBoxComponent<IBASEBOX> implements OnInit {
  @Input() width = 235;


  sliderOptions$: Observable<any>;

  ngOnInit(): void {
    this.sliderOptions$ = of({
      initialSlide: 0,
      speed: 400,
      spaceBetween: 10,
      slidesOffsetAfter: 15,
      slidesOffsetBefore: 15,
      slidesPerView: this.width / 235,
    });
  }

  open(id: number): void {
    this.clickEVT.emit(id);
  }
}
