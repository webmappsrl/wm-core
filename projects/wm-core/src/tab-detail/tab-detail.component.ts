import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {GeoJsonProperties} from 'geojson';
import {IGeojsonFeature, IGeojsonProperties} from '../types/model';
import {ISlopeChartHoverElements} from '../types/slope-chart';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {confOPTIONS} from '@wm-core/store/conf/conf.selector';

@Component({
  standalone: false,
  selector: 'wm-tab-detail',
  templateUrl: './tab-detail.component.html',
  styleUrls: ['./tab-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDetailComponent {
  @Input()
  properties: GeoJsonProperties;
  @Output('slopeChartHover')
  slopeChartHover: EventEmitter<ISlopeChartHoverElements> =
    new EventEmitter<ISlopeChartHoverElements>();

  confOptions$: Observable<any> = this._store.select(confOPTIONS);
  public route: IGeojsonFeature;

  constructor(private _store: Store<any>) {}

  onLocationHover(event: ISlopeChartHoverElements) {
    this.slopeChartHover.emit(event);
  }
}
