import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  OnInit
} from '@angular/core';
import {GeoJsonProperties} from 'geojson';
import {IGeojsonFeature, IGeojsonProperties} from '../types/model';
import {ISlopeChartHoverElements} from '../types/slope-chart';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {ICONF} from 'wm-core/types/config';
import {IConfRootState} from '../store/conf/conf.reducer';

@Component({
  selector: 'wm-tab-detail',
  templateUrl: './tab-detail.component.html',
  styleUrls: ['./tab-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmTabDetailComponent implements OnInit {
  @Input()
  properties: GeoJsonProperties;
  @Output('slopeChartHover')
  slopeChartHover: EventEmitter<ISlopeChartHoverElements> =
    new EventEmitter<ISlopeChartHoverElements>();

  public config$: Observable<ICONF>;
  public route: IGeojsonFeature;

  constructor(private store: Store<IConfRootState>) {}

  ngOnInit() {
    this.config$ = this.store.select(state => state.conf);
  }

  onLocationHover(event: ISlopeChartHoverElements) {
    this.slopeChartHover.emit(event);
  }
}