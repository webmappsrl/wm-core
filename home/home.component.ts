import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  ViewEncapsulation,
  EventEmitter,
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'wm-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeComponent {
  constructor() {}
  @Input() conf: IHOME[];
  @Output() horizontalScrollBoxEVT: EventEmitter<string> = new EventEmitter();
  @Output() poiTypeFilterBoxEVT: EventEmitter<[string, number]> = new EventEmitter();
  @Output() slugBoxEVT: EventEmitter<[string, number]> = new EventEmitter();
  @Output() externalUrlBoxEVT: EventEmitter<string> = new EventEmitter();
  @Output() tracksBoxEVT: EventEmitter<number> = new EventEmitter();
  @Output() layerBoxEVT: EventEmitter<[any, number]> = new EventEmitter();
}
