import {confOPTIONS, confPOIFORMS, confTRACKFORMS} from '@wm-core/store/conf/conf.selector';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {AlertController, IonContent, IonSlides} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {BehaviorSubject, from, Observable, of} from 'rxjs';
import {switchMap, take} from 'rxjs/operators';
import {Point} from 'geojson';
import {WmFeature} from '@wm-types/feature';
import {LangService} from '@wm-core/localization/lang.service';
import {deleteUgcPoi, updateUgcPoi} from '@wm-core/store/features/ugc/ugc.actions';
import {UntypedFormGroup} from '@angular/forms';
import {UrlHandlerService} from '@wm-core/services/url-handler.service';
import {currentUgcPoi, currentUgcPoiProperties} from '@wm-core/store/features/ugc/ugc.selector';

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
  currentUgcPoi$: Observable<WmFeature<Point>> = this._store.select(currentUgcPoi);
  currentUgcPoiProperties$ = this._store.select(currentUgcPoiProperties);
  fg: UntypedFormGroup;
  isEditing$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

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

  constructor(
    private _store: Store,
    private _alertCtlr: AlertController,
    private _langSvc: LangService,
    private _urlHandlerSvc: UrlHandlerService,
  ) {}

  deletePoi(): void {
    this.currentUgcPoi$
      .pipe(
        take(1),
        switchMap(poi => {
          return from(
            this._alertCtlr.create({
              message: this._langSvc.instant(
                'Sicuro di voler eliminare questo POI? La rimozione è irreversibile.',
              ),
              buttons: [
                {text: this._langSvc.instant('Annulla'), role: 'cancel'},
                {
                  text: this._langSvc.instant('Elimina'),
                  handler: () => this._store.dispatch(deleteUgcPoi({poi})),
                },
              ],
            }),
          );
        }),
      )
      .subscribe(alert => alert.present());
  }

  enableEditing(): void {
    this.isEditing$;
  }

  removeUgcPoiFromUrl(): void {
    this._urlHandlerSvc.updateURL({ugc_poi: undefined});
  }

  triggerDismiss(): void {
    this.removeUgcPoiFromUrl();
    this.dismiss.emit();
  }

  updatePoi(): void {
    this.currentUgcPoi$.pipe(take(1)).subscribe(currentUgcPoi => {
      if (this.fg.valid) {
        const poi: WmFeature<Point> = {
          ...currentUgcPoi,
          properties: {
            ...currentUgcPoi?.properties,
            name: this.fg.value.title,
            form: this.fg.value,
            updatedAt: new Date(),
          },
        };

        this._store.dispatch(updateUgcPoi({poi}));
        this.isEditing$.next(false);
      }
    });
  }
}
