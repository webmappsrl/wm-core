import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {BaseBoxComponent} from '../box';
import {IBASEBOX, IHOMEITEMFEATURE} from '../../types/config';

@Component({
  standalone: false,
  selector: 'wm-features-box',
  templateUrl: './features-box.component.html',
  styleUrls: ['./features-box.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FeaturesBoxComponent extends BaseBoxComponent<IBASEBOX> {
  @Output() public poiIdEVT: EventEmitter<number> = new EventEmitter<number>();
  @Output() public trackIdEVT: EventEmitter<number> = new EventEmitter<number>();
  @ViewChild('tracks') tracksContent: ElementRef;

  clickFeature(feature: IHOMEITEMFEATURE): void {
    if (feature.track_id) {
      this.trackIdEVT.emit(feature.track_id);
    } else if (feature.poi_id) {
      this.poiIdEVT.emit(feature.poi_id);
    }
  }

  scrollLeft(): void {
    this.tracksContent.nativeElement.scrollLeft -= 150;
  }

  scrollRight(): void {
    this.tracksContent.nativeElement.scrollLeft += 150;
  }
}
