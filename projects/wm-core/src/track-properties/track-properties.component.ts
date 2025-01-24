import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confFlowLineQuote, confOPTIONS} from '@wm-core/store/conf/conf.selector';
import {currentEcTrack, currentEcTrackProperties} from '@wm-core/store/features/ec/ec.selector';
import {trackElevationChartHoverElemenents} from '@wm-core/store/user-activity/user-activity.action';
import {chartHoverElements, ecLayer, flowLineQuoteText} from '@wm-core/store/user-activity/user-activity.selector';
import {IOPTIONS} from '@wm-core/types/config';
import {LineStringProperties, WmFeature} from '@wm-types/feature';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {LineString} from 'geojson';
import {BehaviorSubject, Observable, combineLatest} from 'rxjs';
import {distinctUntilChanged, filter, take} from 'rxjs/operators';
@Component({
  selector: 'wm-track-properties',
  templateUrl: './track-properties.component.html',
  styleUrls: ['./track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TrackPropertiesComponent {
  chartHoverElements$: Observable<WmSlopeChartHoverElements> =
    this._store.select(chartHoverElements);
  confOPTIONS$: Observable<IOPTIONS> = this._store.select(confOPTIONS);
  currentLayer$ = this._store.select(ecLayer);
  ecTrack$: Observable<WmFeature<LineString>> = this._store.select(currentEcTrack);
  ecTrackProperties$: Observable<LineStringProperties> =
    this._store.select(currentEcTrackProperties);
  flowLineQuoteText$: Observable<string | null> = this._store.select(flowLineQuoteText);

  constructor(private _store: Store, private _urlHandlerSvc: UrlHandlerService) {}

  close(): void {
    this._urlHandlerSvc.updateURL({track: undefined});
  }

  getFlowPopoverText(altitude = 0, orangeTreshold = 800, redTreshold = 1500): string {
    const green = `<span class="green">Livello 1: tratti non interessati dall'alta quota (quota minore di ${orangeTreshold} metri)</span>`;
    const orange = `<span class="orange">Livello 2: tratti parzialmente in alta quota (quota compresa tra ${orangeTreshold} metri e ${redTreshold} metri)</span>`;
    const red = `<span class="red">Livello 3: in alta quota (quota superiore ${redTreshold} metri)</span>`;
    return altitude < orangeTreshold
      ? green
      : altitude > orangeTreshold && altitude < redTreshold
      ? orange
      : red;
  }

  onLocationHover(event: WmSlopeChartHoverElements): void {
    this._store.dispatch(trackElevationChartHoverElemenents({elements: event}));
  }
}
