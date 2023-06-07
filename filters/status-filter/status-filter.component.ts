import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'wm-status-filter',
  templateUrl: './status-filter.component.html',
  styleUrls: ['./status-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusFilterComponent {
  @Input() layer: any;
  @Input() poiFilters: any[];
  @Input() trackFilters: any[];
  @Output() removeLayerEVT: EventEmitter<any> = new EventEmitter();
  @Output() removePoiFilterEVT: EventEmitter<string> = new EventEmitter();
  @Output() removeTrackFilterEVT: EventEmitter<string> = new EventEmitter();
  @Output() resetFiltersEVT: EventEmitter<void> = new EventEmitter();

  constructor() {}
}
