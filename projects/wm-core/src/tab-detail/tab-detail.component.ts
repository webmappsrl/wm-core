import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {IGeojsonFeature, IGeojsonProperties} from '../types/model';
import {ISlopeChartHoverElements} from '../types/slope-chart';

@Component({
  selector: 'wm-tab-detail',
  templateUrl: './tab-detail.component.html',
  styleUrls: ['./tab-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDetailComponent {
  @Input()
  properties: IGeojsonProperties;
  @Output('slopeChartHover')
  slopeChartHover: EventEmitter<ISlopeChartHoverElements> =
    new EventEmitter<ISlopeChartHoverElements>();

  public route: IGeojsonFeature;

  constructor() {}

  onLocationHover(event: ISlopeChartHoverElements) {
    this.slopeChartHover.emit(event);
  }
}
