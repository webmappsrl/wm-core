import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {BaseBoxComponent} from '../../box/box';

@Component({
  selector: 'wm-horizontal-scroll-box',
  templateUrl: './horizontal-scroll-box.component.html',
  styleUrls: ['./horizontal-scroll-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class HorizontalScrollBoxComponent extends BaseBoxComponent<IHORIZONTALSCROLLBOX> {
  @Output() public clickEVT: EventEmitter<any> = new EventEmitter<number>();
  @ViewChild('items') items: ElementRef;

  scrollLeft(): void {
    this.items.nativeElement.scrollLeft -= 150;
  }

  scrollRight(): void {
    this.items.nativeElement.scrollLeft += 150;
  }
}
