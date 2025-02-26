import {Component, ChangeDetectionStrategy, ViewEncapsulation} from '@angular/core';
import {Store} from '@ngrx/store';
import { LangService } from '@wm-core/localization/lang.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confOPTIONS, flowLineQuoteShow} from '@wm-core/store/conf/conf.selector';
import {currentEcTrack, currentEcTrackProperties} from '@wm-core/store/features/ec/ec.selector';
import {trackElevationChartHoverElemenents} from '@wm-core/store/user-activity/user-activity.action';
import {
  chartHoverElements,
  ecLayer,
  flowLineQuoteText,
} from '@wm-core/store/user-activity/user-activity.selector';
import {IOPTIONS} from '@wm-core/types/config';
import {LineStringProperties, WmFeature} from '@wm-types/feature';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {LineString} from 'geojson';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
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
  flowLineQuoteHtml$: Observable<string> = this._store.select(flowLineQuoteText).pipe(
    map((flowLineQuoteText) => {
      if (!flowLineQuoteText) return '';
      const translatedText = this._langSvc.instant(flowLineQuoteText.html);
      return translatedText.replace('{{orange}}', flowLineQuoteText.flow_line_quote_orange).replace('{{red}}', flowLineQuoteText.flow_line_quote_red);
    }),
  );
  flowLineQuoteShow$: Observable<boolean> = this._store.select(flowLineQuoteShow);

  constructor(
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    private _langSvc: LangService,
  ) {}

  close(): void {
    this._urlHandlerSvc.updateURL({track: undefined});
  }

  onLocationHover(event: WmSlopeChartHoverElements): void {
    this._store.dispatch(trackElevationChartHoverElemenents({elements: event}));
  }
}
