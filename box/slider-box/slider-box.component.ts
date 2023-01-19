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
import {IBASEBOX} from '../../types/config';
import {BaseBoxComponent} from '../box';

@Component({
  selector: 'wm-slider-box',
  templateUrl: './slider-box.component.html',
  styleUrls: ['./slider-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SliderBoxComponent extends BaseBoxComponent<IBASEBOX> implements OnInit {
  @Input() width = 235;
  @Output() clickEVT: EventEmitter<number> = new EventEmitter<number>();

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
