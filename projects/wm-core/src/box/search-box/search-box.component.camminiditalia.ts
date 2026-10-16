// Variante camminiditalia di wm-search-box (oc:8701), attivata con `fileReplacements`: la logica
// comune sta in `SearchBoxBaseComponent`; il template è una copia di quello di default più il chip,
// e una correzione al template di default va riportata a mano anche qui.
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnChanges,
  ViewEncapsulation,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {PassportStageChip} from '@wm-types/passport';
import {ugcOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {LangService} from '@wm-core/localization/lang.service';
import {PassportService} from '@wm-core/passport/passport.service';
import {passportShortDate, passportStageChip} from '@wm-core/passport/passport.utils';
import {SearchBoxBaseComponent} from './search-box-base.component';

@Component({
  standalone: false,
  selector: 'wm-search-box',
  templateUrl: './search-box.component.camminiditalia.html',
  styleUrls: ['./search-box.component.scss', './search-box.component.camminiditalia.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SearchBoxComponent extends SearchBoxBaseComponent implements OnChanges {
  /** Stato della tappa nel passaporto, `null` se il chip non va mostrato (oc:8701). */
  chip$: Observable<PassportStageChip | null> = of(null);

  constructor(
    langSvc: LangService,
    cdr: ChangeDetectorRef,
    store: Store,
    private _passportSvc: PassportService,
    private _el: ElementRef<HTMLElement>,
  ) {
    super(langSvc, cdr, store);
  }

  /**
   * Ricalcola il chip quando cambia la tappa. Sulle tracce dell'utente («I miei percorsi») il chip
   * non c'è: i loro id si sovrappongono a quelli delle tappe ufficiali. Nel carosello della mappa
   * non c'è nemmeno la lettura del passaporto: la card è alta 102px fissi e il chip non ci sta.
   */
  ngOnChanges(): void {
    if (this._el.nativeElement.closest?.('wm-features-in-viewport')) {
      this.chip$ = of(null);
      return;
    }
    const data = this.data;
    this.chip$ = combineLatest([
      this._store.select(ugcOpened),
      this._passportSvc.stageIndex$(),
    ]).pipe(map(([ugc, index]) => (ugc ? null : passportStageChip(index, data?.id, data?.layers))));
  }

  /**
   * Data breve della validazione nella lingua corrente («12 mag»).
   *
   * @param iso Data ISO 8601.
   * @returns La data formattata.
   */
  chipDate(iso: string): string {
    return passportShortDate(iso, this._langSvc.currentLang);
  }
}
