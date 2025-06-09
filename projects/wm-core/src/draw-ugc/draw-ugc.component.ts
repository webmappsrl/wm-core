import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {UntypedFormGroup} from '@angular/forms';
import {BehaviorSubject, EMPTY, from, Observable, of} from 'rxjs';
import {Store} from '@ngrx/store';
import {confPOIFORMS, confTRACKFORMS} from '@wm-core/store/conf/conf.selector';
import {hasCustomTrack, homeOpened} from '@wm-core/store/user-activity/user-activity.selector';
import {catchError, map, switchMap, take} from 'rxjs/operators';
import {WmFeature, WmProperties} from '@wm-types/feature';
import {LineString, Point} from 'geojson';
import {currentUgcDrawn} from '@wm-core/store/features/ugc/ugc.selector';
import {addFormError, removeFormError} from '@wm-core/utils/form';
import {Photo} from '@capacitor/camera';
import {DeviceService} from '@wm-core/services/device.service';
import {generateUUID, saveUgc} from '@wm-core/utils/localForage';
import {EnvironmentService} from '@wm-core/services/environment.service';
import {AlertController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {syncUgc, currentCustomTrack} from '@wm-core/store/features/ugc/ugc.actions';
import {startDrawUgcPoi} from '@wm-core/store/user-activity/user-activity.action';

@Component({
  selector: 'wm-draw-ugc',
  templateUrl: './draw-ugc.component.html',
  styleUrls: ['./draw-ugc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmDrawUgcComponent {
  confFORMS$: Observable<any>;
  homeOpened$: Observable<boolean> = this._store.select(homeOpened);
  hasCustomTrack$: Observable<boolean> = this._store.select(hasCustomTrack);
  currentUgcDrawn$: Observable<WmFeature<LineString | Point>> = this._store.select(currentUgcDrawn);
  formGroup$: BehaviorSubject<UntypedFormGroup> = new BehaviorSubject<UntypedFormGroup>(null);
  isIvalidForm$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  get currentUgcTrackDrawn$(): Observable<WmFeature<LineString>> {
    return this.currentUgcDrawn$ as Observable<WmFeature<LineString>>;
  }

  private _photos: Photo[] = [];

  constructor(
    private _store: Store,
    private _deviceSvc: DeviceService,
    private _enviromentSvc: EnvironmentService,
    private _alertCtrl: AlertController,
    private _langSvc: LangService,
  ) {
    this.hasCustomTrack$.pipe(take(1)).subscribe(hasCustomTrack => {
      if (hasCustomTrack) {
        this.confFORMS$ = this._store.select(confTRACKFORMS);
      } else {
        this.confFORMS$ = this._store.select(confPOIFORMS);
      }
    });
  }

  startAddPhotos(): void {
    addFormError(this.formGroup$.value, {photo: true});
  }

  endAddPhotos(): void {
    removeFormError(this.formGroup$.value, 'photo');
  }

  photosChanged(photos: Photo[]): void {
    this._photos = photos;
  }

  saveUgc(): void {
    // TODO: Logica duplicata in modal-ugc-uploader.component.ts
    this.currentUgcDrawn$
      .pipe(
        take(1),
        switchMap(ugcDrawn =>
          from(this._deviceSvc.getInfo()).pipe(
            map(device => {
              const ugc: WmFeature<LineString | Point> = {...ugcDrawn};
              const ugcProperties = ugc?.properties;
              const dateNow = new Date();
              const formGroup = this.formGroup$.value;
              const formGroupValue = formGroup.value;
              const properties: WmProperties = {
                name: formGroupValue?.title,
                form: formGroupValue ?? undefined,
                uuid: generateUUID(),
                app_id: `${this._enviromentSvc.appId}`,
                createdAt: dateNow,
                updatedAt: dateNow,
                media: this._photos,
                ugcProperties,
                device,
              };

              ugc.properties = properties;
              return ugc;
            }),
          ),
        ),
        switchMap(feature => saveUgc(feature)),
        switchMap(_ => {
          this._store.dispatch(startDrawUgcPoi({ugcPoi: null}));
          this._store.dispatch(currentCustomTrack({currentCustomTrack: null}));
          return this._alertCtrl.create({
            message: `${this._langSvc.instant('Il salvataggio è stato completato')}!`,
            buttons: ['OK'],
          });
        }),
        switchMap(alert => alert.present()),
        catchError(_ => {
          this._alertCtrl.create({
            message: `${this._langSvc.instant(
              'Si è verificato un errore durante il salvataggio. Riprova',
            )}!`,
          });
          return EMPTY;
        }),
      )
      .subscribe(() => this._store.dispatch(syncUgc()));
  }
}
