import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IBASEBOX} from '../../types/config';

@Component({
  selector: 'wm-tracks-box',
  templateUrl: './tracks-box.component.html',
  styleUrls: ['./tracks-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TracksBoxComponent extends BaseBoxComponent<IBASEBOX> {
  @Output() public trackIdEVT: EventEmitter<number> = new EventEmitter<number>();
  @ViewChild('tracks') tracksContent: ElementRef;

  scrollLeft(): void {
    this.tracksContent.nativeElement.scrollLeft -= 150;
  }

  scrollRight(): void {
    this.tracksContent.nativeElement.scrollLeft += 150;
  }
}
