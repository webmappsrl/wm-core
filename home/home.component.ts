import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  ViewEncapsulation,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'wm-home-page',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmHomeComponent {
  @Input() conf: IHOME[];
  @Output() externalUrlBoxEVT: EventEmitter<string> = new EventEmitter();
  @Output() horizontalScrollBoxEVT: EventEmitter<any> = new EventEmitter();
  @Output() layerBoxEVT: EventEmitter<[any, number]> = new EventEmitter();
  @Output() poiTypeFilterBoxEVT: EventEmitter<[string, number]> = new EventEmitter();
  @Output() slugBoxEVT: EventEmitter<[string, number]> = new EventEmitter();
  @Output() tracksBoxEVT: EventEmitter<number> = new EventEmitter();

  sendHorizontalScrollBoxEVT(identifier: string, box: IHORIZONTALSCROLLBOX): void {
    const evt = {identifier, taxonomy: box.item_type};
    this.horizontalScrollBoxEVT.emit(evt);
  }

  constructor() {}
}
