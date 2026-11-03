import {Directive} from '@angular/core';
import {Store} from '@ngrx/store';
import {LangService} from '@wm-core/localization/lang.service';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {confOPTIONS, flowLineQuoteShow} from '@wm-core/store/conf/conf.selector';
import {currentEcTrack, currentEcTrackProperties} from '@wm-core/store/features/ec/ec.selector';
import {trackElevationChartHoverElemenents} from '@wm-core/store/user-activity/user-activity.action';
import {
  chartHoverElements,
  ecLayer,
  flowLineQuoteText,
  trackProgress,
} from '@wm-core/store/user-activity/user-activity.selector';
import {OPTIONS} from '@wm-types/config';
import {LineStringProperties, WmFeature} from '@wm-types/feature';
import {WmSlopeChartFlowLineQuote, WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {LineString} from 'geojson';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

/**
 * Logica condivisa fra `wm-track-properties` di default e la sua variante camminiditalia
 * (oc:8169). Ogni sottoclasse dichiara `selector`, `templateUrl` e `styleUrls` — gli stessi: il
 * template è uno solo e la variante accende soltanto `showDiaries`.
 *
 * File mai soggetto a `fileReplacements`: la variante non può importare dal file di default
 * (l'import diventerebbe circolare, `TS2506`). `@Directive()` astratta genera la factory DI
 * (`ɵfac`) da cui le sottoclassi ereditano i parametri del costruttore; senza, l'errore `NG0202`
 * comparirebbe solo a runtime. La guardia è in `track-properties-base.component.spec.ts`.
 */
@Directive()
export abstract class TrackPropertiesBaseComponent {
  chartHoverElements$: Observable<WmSlopeChartHoverElements> =
    this._store.select(chartHoverElements);
  confOPTIONS$: Observable<OPTIONS> = this._store.select(confOPTIONS);
  currentLayer$ = this._store.select(ecLayer);
  ecTrack$: Observable<WmFeature<LineString>> = this._store.select(currentEcTrack);
  ecTrackProperties$: Observable<LineStringProperties> =
    this._store.select(currentEcTrackProperties);
  flowLineQuoteHtml$: Observable<string> = this._store.select(flowLineQuoteText).pipe(
    map((flowLineQuoteText: WmSlopeChartFlowLineQuote) => {
      if (!flowLineQuoteText) return '';
      const translatedText = this._langSvc.instant(flowLineQuoteText.html);
      return translatedText.replace('{{orange}}', flowLineQuoteText.flow_line_quote_orange).replace('{{red}}', flowLineQuoteText.flow_line_quote_red);
    }),
  );
  flowLineQuoteShow$: Observable<boolean> = this._store.select(flowLineQuoteShow);
  /** Mostra la sezione delle esperienze (oc:8169): accesa solo dalla variante camminiditalia. */
  readonly showDiaries: boolean = false;
  /**
   * Pulsante per scrivere il diario della tappa (oc:8169, ciclo 2): sempre nel default, solo vicino
   * al cammino nella variante camminiditalia.
   */
  diaryCanWrite$: Observable<boolean> = of(true);
  trackProgress$: Observable<number | null> = this._store.select(trackProgress);

  constructor(
    private _store: Store,
    private _urlHandlerSvc: UrlHandlerService,
    private _langSvc: LangService,
  ) {}

  /** Chiude il dettaglio della traccia. */
  close(): void {
    this._urlHandlerSvc.closeTrack();
  }

  /**
   * Riga in cima al form delle esperienze (oc:8169): tappa e cammino, solo le parti non vuote.
   *
   * @param trackName Nome della tappa, già tradotto.
   * @param layerTitle Titolo del cammino, già tradotto.
   * @returns «Tappa · Cammino», o la sola parte presente.
   */
  diaryContextLabel(trackName?: string, layerTitle?: string): string {
    return [trackName, layerTitle].filter(part => !!part).join(' · ');
  }

  /**
   * Propaga allo store l'hover sul profilo altimetrico.
   *
   * @param event Elementi sotto il cursore nel grafico.
   */
  onLocationHover(event: WmSlopeChartHoverElements): void {
    this._store.dispatch(trackElevationChartHoverElemenents({elements: event}));
  }
}
