import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {MediaProperties, WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-modal-media',
  templateUrl: './wm-modal-media.component.html',
  styleUrls: ['./wm-modal-media.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmModalMediaComponent {
  @Input('media') set setMedia(media: WmFeature<Point, MediaProperties>) {
    this.media$.next(media);
  }

  @Input() caption: string;
  @Input('showArrows') showArrow = false;
  @Output() closeMediaEVT: EventEmitter<void> = new EventEmitter<void>();
  @Output() nextMediaEVT: EventEmitter<void> = new EventEmitter<void>();
  @Output() prevMediaEVT: EventEmitter<void> = new EventEmitter<void>();

  media$: BehaviorSubject<WmFeature<Point, MediaProperties>> = new BehaviorSubject<
    WmFeature<Point, MediaProperties>
  >(null);
}
