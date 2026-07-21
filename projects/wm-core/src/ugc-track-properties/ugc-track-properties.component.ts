import {confOPTIONS, confTRACKFORMS} from '@wm-core/store/conf/conf.selector';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {WmSwiperComponent} from '@wm-core/swiper/swiper.component';
import {AlertController, IonContent} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, from, Observable} from 'rxjs';
import {take, tap} from 'rxjs/operators';
import {LineString} from 'geojson';
import {WmFeature} from '@wm-types/feature';
import {LangService} from '@wm-core/localization/lang.service';
import {deleteUgcTrack, updateUgcTrack} from '@wm-core/store/features/ugc/ugc.actions';
import {UntypedFormGroup} from '@angular/forms';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {WmSlopeChartHoverElements} from '@wm-types/slope-chart';
import {trackElevationChartHoverElemenents} from '@wm-core/store/user-activity/user-activity.action';
import {UgcPropertiesBaseComponent} from '@wm-core/ugc-properties-base/ugc-properties-base.component';
import {EUgcTrackShareState} from '@wm-core/types/eugc-track-share-state.enum';

/**
 * Outcome reported back by the parent (webmapp-app) once the share pipeline
 * (screenshot in map-core → backend compositing → native Stories plugin) settles.
 * `ugc-track-properties` never talks to the map or the native plugin directly: it only
 * emits a `share-track` request and waits for this input to move out of `GENERATING`.
 */
export interface UgcTrackShareResult {
  errorMessage?: string;
  success: boolean;
}

@Component({
  standalone: false,
  selector: 'wm-ugc-track-properties',
  templateUrl: './ugc-track-properties.component.html',
  styleUrls: ['./ugc-track-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcTrackPropertiesComponent extends UgcPropertiesBaseComponent {
  @Input('track') set setTrack(track: WmFeature<LineString>) {
    if (track != null) {
      this.track = track;
    }
  }

  @Output('dismiss') dismiss: EventEmitter<any> = new EventEmitter<any>();
  @Output('poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();
  @Output('share-track') shareTrack: EventEmitter<WmFeature<LineString>> =
    new EventEmitter<WmFeature<LineString>>();
  @Output()
  trackElevationChartHover: EventEmitter<WmSlopeChartHoverElements> =
    new EventEmitter<WmSlopeChartHoverElements>();
  @ViewChild('content') content: IonContent;
  @ViewChild('slider') slider: WmSwiperComponent;

  /**
   * Outcome of a previously requested share, reported back by the parent once the
   * screenshot/compositing/native-plugin pipeline settles. Setting it to `null` is a
   * no-op (initial binding value before the parent has anything to report).
   */
  @Input('shareResult') set setShareResult(result: UgcTrackShareResult | null) {
    if (result == null) {
      return;
    }
    this.shareErrorMessage = result.success ? null : result.errorMessage ?? null;
    this.shareState$.next(
      result.success ? EUgcTrackShareState.SUCCESS : EUgcTrackShareState.ERROR,
    );
    if (!result.success) {
      this.presentShareErrorAlert(this.shareErrorMessage ?? 'Condivisione non riuscita');
    }
  }

  /**
   * Local alias so the template can reference enum members without importing them.
   */
  readonly EUgcTrackShareState = EUgcTrackShareState;
  confOPTIONS$ = this._store.select(confOPTIONS);
  confTRACKFORMS$: Observable<any[]> = this._store.select(confTRACKFORMS);
  currentImage$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  fg: UntypedFormGroup;
  isEditing$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  shareErrorMessage: string | null = null;
  shareState$: BehaviorSubject<EUgcTrackShareState> = new BehaviorSubject<EUgcTrackShareState>(
    EUgcTrackShareState.IDLE,
  );
  slideOptions = {
    allowTouchMove: false,
    slidesPerView: 1,
    slidesPerColumn: 1,
    slidesPerGroup: 1,
    centeredSlides: true,
    watchSlidesProgress: true,
    spaceBetween: 20,
    loop: true,
  };
  track: WmFeature<LineString>;

  constructor(
    private _store: Store,
    private _alertCtlr: AlertController,
    private _langSvc: LangService,
    private _urlHandlerSvc: UrlHandlerService,
  ) {
    super();
  }

  @HostListener('document:keydown.Escape', ['$event'])
  public close(): void {
    this.currentImage$.next(null);
  }

  @HostListener('keydown.ArrowRight', ['$event'])
  public next(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      swiper.slideNext();
    }
  }

  @HostListener('keydown.ArrowLeft', ['$event'])
  public prev(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      swiper.slidePrev();
    }
  }

  clickPhoto(): void {
    const swiper = this.slider?.swiper;
    if (swiper) {
      this.currentImage$.next(this.track.properties.photos[swiper.activeIndex - 1]?.photoURL);
    }
  }

  deleteTrack(): void {
    from(
      this._alertCtlr.create({
        message: this._langSvc.instant(
          'Sicuro di voler eliminare questa traccia? La rimozione è irreversibile.',
        ),
        buttons: [
          {text: this._langSvc.instant('Annulla'), role: 'cancel'},
          {
            text: this._langSvc.instant('elimina'),
            handler: () => this._store.dispatch(deleteUgcTrack({track: this.track})),
          },
        ],
      }),
    ).subscribe(alert => alert.present());
  }

  /**
   * Same alert-based pattern already used by `deleteTrack()` for error/confirmation
   * feedback, instead of an inline banner in the template. "Riprova" re-emits the same
   * `share-track` event via `triggerShare()` (same retry path as before).
   */
  private presentShareErrorAlert(message: string): void {
    from(
      this._alertCtlr.create({
        message: this._langSvc.instant(message),
        buttons: [
          {text: this._langSvc.instant('Annulla'), role: 'cancel'},
          {text: this._langSvc.instant('Riprova'), handler: () => this.triggerShare()},
        ],
      }),
    ).subscribe(alert => alert.present());
  }

  onLocationHover(event: WmSlopeChartHoverElements): void {
    this._store.dispatch(trackElevationChartHoverElemenents({elements: event}));
  }

  removeUgcTrackFromUrl(): void {
    this._urlHandlerSvc.updateURL({ugc_track: undefined});
  }

  triggerDismiss(): void {
    this.removeUgcTrackFromUrl();
    this.dismiss.emit();
  }

  /**
   * Requests a share of the current track. Used both for the initial tap and for the
   * explicit retry action on error — same event, same payload, no silent auto-retry.
   * Guarded against re-entrancy while a share is already `GENERATING`, in addition to
   * the button's own `disabled` state (defense in depth against double taps).
   */
  triggerShare(): void {
    if (this.shareState$.value === EUgcTrackShareState.GENERATING) {
      return;
    }
    this.shareErrorMessage = null;
    this.shareState$.next(EUgcTrackShareState.GENERATING);
    this.shareTrack.emit(this.track);
  }

  updateTrack(): void {
    if (this.fg.valid) {
      const track: WmFeature<LineString> = {
        ...this.track,
        properties: {
          ...this.track?.properties,
          name: this.fg.value.title,
          form: this.fg.value,
          media: this.photos,
          updatedAt: new Date(),
        },
      };

      this._store.dispatch(updateUgcTrack({track}));
      this.isEditing$.next(false);
    }
  }
}
