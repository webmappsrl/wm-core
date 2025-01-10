import {confOPTIONS, confPOIFORMS, confTRACKFORMS} from '@wm-core/store/conf/conf.selector';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {AlertController, IonContent, IonSlides} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {filter, map, switchMap, take, tap} from 'rxjs/operators';
import {LineString} from 'geojson';
import {Media, MediaProperties, WmFeature} from '@wm-types/feature';
import {getUgcMediasByIds} from '@wm-core/utils/localForage';
import {ActivatedRoute, Router} from '@angular/router';
import {LangService} from '@wm-core/localization/lang.service';
import {deleteUgcTrack, updateUgcTrack} from '@wm-core/store/features/ugc/ugc.actions';
import {UntypedFormGroup} from '@angular/forms';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {currentUgcPoiProperties} from '@wm-core/store/features/ugc/ugc.selector';

@Component({
  selector: 'wm-ugc-poi-properties',
  templateUrl: './ugc-poi-properties.component.html',
  styleUrls: ['./ugc-poi-properties.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class UgcPoiPropertiesComponent {
  @Output('dismiss') dismiss: EventEmitter<any> = new EventEmitter<any>();
  @Output('poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();
  @ViewChild('content') content: IonContent;
  @ViewChild('slider') slider: IonSlides;

  confOPTIONS$ = this._store.select(confOPTIONS);
  confPOIFORMS$: Observable<any[]> = this._store.select(confPOIFORMS);
  currentImage$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  currentUgcPoiProperties$ = this._store.select(currentUgcPoiProperties);
  fg: UntypedFormGroup;
  isEditing$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  medias$: Observable<WmFeature<Media, MediaProperties>[]> = this.currentUgcPoiProperties$.pipe(
    filter(poiProperties => poiProperties != null),
    take(1),
    switchMap(poiProperties => {
      if (poiProperties.photoKeys) {
        return from(getUgcMediasByIds(poiProperties.photoKeys.map(key => key.toString())));
      }
      return of(null);
    }),
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
  ) {}

  @HostListener('document:keydown.Escape', ['$event'])
  public close(): void {
    this.currentImage$.next(null);
  }

  @HostListener('keydown.ArrowRight', ['$event'])
  public next(): void {
    this.slider.slideNext();
  }

  @HostListener('keydown.ArrowLeft', ['$event'])
  public prev(): void {
    this.slider.slidePrev();
  }

  clickPhoto(): void {
    from(this.slider.getActiveIndex())
      .pipe(tap(index => this.currentImage$.next(this.track.properties.photos[index - 1].photoURL)))
      .subscribe();
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
            text: this._langSvc.instant('Elimina'),
            handler: () => this._store.dispatch(deleteUgcTrack({track: this.track})),
          },
        ],
      }),
    ).subscribe(alert => alert.present());
  }

  enableEditing(): void {
    this.isEditing$;
  }

  removeUgcTrackFromUrl(): void {
    this._urlHandlerSvc.updateURL({ugc_track: undefined});
  }

  triggerDismiss(): void {
    this.removeUgcTrackFromUrl();
    this.dismiss.emit();
  }

  updateTrack(): void {
    if (this.fg.valid) {
      const track: WmFeature<LineString> = {
        ...this.track,
        properties: {
          ...this.track?.properties,
          name: this.fg.value.title,
          form: this.fg.value,
          updatedAt: new Date(),
        },
      };

      this._store.dispatch(updateUgcTrack({track}));
      this.isEditing$.next(false);
    }
  }
}
