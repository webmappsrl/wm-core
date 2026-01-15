import {
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {UntypedFormGroup} from '@angular/forms';
import {AlertController, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {
  confGeohubId,
  confMAP,
  confPOIFORMS,
  confTRACKFORMS,
} from '@wm-core/store/conf/conf.selector';
import {WmFeature, WmProperties} from '@wm-types/feature';
import {FeatureCollection, LineString, Point} from 'geojson';
import {BehaviorSubject, combineLatest, EMPTY, from, Observable} from 'rxjs';
import * as toGeoJSON from '@tmcw/togeojson';
import {catchError, map, startWith, switchMap, take} from 'rxjs/operators';
import {DeviceService} from '@wm-core/services/device.service';
import {LangService} from '@wm-core/localization/lang.service';
import {saveUgc} from '@wm-core/utils/localForage';
import {generateUUID} from '@wm-core/utils/localForage';
import {syncUgc} from '@wm-core/store/features/ugc/ugc.actions';
import {Photo} from '@capacitor/camera';
import {addFormError, removeFormError} from '@wm-core/utils/form';
import {isValidWmFeature} from '@wm-core/utils/features';

@Component({
  standalone: false,
  selector: 'wm-modal-ugc-uploader',
  templateUrl: './modal-ugc-uploader.component.html',
  styleUrls: ['./modal-ugc-uploader.component.scss'],
  encapsulation: ViewEncapsulation.None, //TODO do not use change detection strategy
})
export class ModalUgcUploaderComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  acceptedFileTypes: string = '.gpx,.kml,.geojson,application/gpx+xml,application/octet-stream';
  confMap$: Observable<any> = this._store.select(confMAP);
  confFORMS$: Observable<any[]>;
  formGroup$: BehaviorSubject<UntypedFormGroup> = new BehaviorSubject<UntypedFormGroup>(null);
  geohubId$: Observable<number> = this._store.select(confGeohubId);
  isDragging$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  selectedFile$: BehaviorSubject<File | null> = new BehaviorSubject<File | null>(null);
  ugcFeature$: BehaviorSubject<WmFeature<LineString | Point> | null> =
    new BehaviorSubject<WmFeature<LineString | Point> | null>(null);
  ugcType$: BehaviorSubject<'track' | 'poi'> = new BehaviorSubject<'track' | 'poi'>(null);
  isUploadDisabled$: Observable<boolean>;
  isIvalidForm$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  _photos: Photo[] = [];

  constructor(
    private _store: Store,
    private _modalCtrl: ModalController,
    private _deviceSvc: DeviceService,
    private _langSvc: LangService,
    private _alertCtrl: AlertController,
  ) {
    this.isUploadDisabled$ = combineLatest([this.selectedFile$, this.isIvalidForm$]).pipe(
      map(([selectedFile, invalid]) => {
        return !selectedFile || invalid;
      }),
      startWith(true),
    );
  }

  cancel(): void {
    this._modalCtrl.dismiss();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging$.next(false);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging$.next(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging$.next(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this._handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this._handleFile(input.files[0]);
    }
  }

  removeFile(): void {
    this.selectedFile$.next(null);
    this.ugcFeature$.next(null);
  }
  setForm(form: UntypedFormGroup): void {
    this.formGroup$.next(form);
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

  upload(): void {
    // TODO: Logica duplicata in draw-track.component.ts
    if (this.selectedFile$.value) {
      this.geohubId$
        .pipe(
          take(1),
          switchMap(geohubId =>
            from(this._deviceSvc.getInfo()).pipe(
              map(device => {
                const dateNow = new Date();
                const fg = this.formGroup$.value;
                const formValue = fg.value;
                const properties: WmProperties = {
                  name: formValue?.title,
                  form: formValue,
                  uuid: generateUUID(),
                  app_id: `${geohubId}`,
                  createdAt: dateNow,
                  updatedAt: dateNow,
                  media: this._photos,
                  device,
                };
                this.ugcFeature$.next({
                  ...this.ugcFeature$.value,
                  properties: {
                    ...this.ugcFeature$.value?.properties,
                    ...properties,
                  },
                });
                return this.ugcFeature$.value;
              }),
            ),
          ),
          switchMap(feature => saveUgc(feature)),
          switchMap(_ => {
            this.cancel();
            return this._alertCtrl.create({
              message: `${this._langSvc.instant('La traccia è stata salvata correttamente')}!`,
              buttons: ['OK'],
            });
          }),
          switchMap(alert => alert.present()),
          catchError(_ => {
            this._showErrorAlert(
              this._langSvc.instant(
                'Si è verificato un errore durante il salvataggio della traccia. Riprova',
              ),
            );
            return EMPTY;
          }),
        )
        .subscribe(() => this._store.dispatch(syncUgc()));
    }
  }

  private _handleGeometryType(geometry: LineString | Point): void {
    if (geometry.type === 'LineString') {
      this.confFORMS$ = this._store.select(confTRACKFORMS);
    } else if (geometry.type === 'Point') {
      this.confFORMS$ = this._store.select(confPOIFORMS);
      /*TODO: Necessario perchè nel backend la tabella ugc_pois accetta solo geometrie 2D
              capire se sarebbe meglio avere una tabella ugc_pois che accetti anche geometrie 3D*/
      this._force2DGeometry(geometry);
    }
  }

  private _deleteUnnecessaryProperties(
    feature: WmFeature<LineString | Point>,
  ): WmFeature<LineString | Point> {
    if (feature?.properties) {
      const id = feature.properties.id;
      delete feature.properties.id;
      delete feature.properties.uuid;
      delete feature.properties.image_gallery;
      if (id) {
        feature.properties.onwer_id ??= id;
      }
    }
    return feature;
  }

  private _deserializeKmlProperties(
    feature: WmFeature<LineString | Point>,
  ): WmFeature<LineString | Point> {
    const isValidJSON = (value: string): boolean => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    };

    return {
      ...feature,
      properties: Object.entries(feature.properties).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' && isValidJSON(value) ? JSON.parse(value) : value;
        return acc;
      }, {} as {[key: string]: any}),
    };
  }

  private _force2DGeometry(geometry: Point): void {
    geometry.coordinates = [geometry.coordinates[0], geometry.coordinates[1]];
  }

  private _handleFile(file: File): void {
    if (!this._isFileTypeAccepted(file)) {
      this.selectedFile$.next(null);
      this._showErrorAlert(this._langSvc.instant('Tipo di file non supportato'));
      return;
    }

    this._readFileContent(file)
      .pipe(
        take(1),
        map(fileContent => {
          const result = this._validateAndConvertToWmFeature(fileContent, file.name);
          if (result) {
            this.ugcFeature$.next(result);
            this.selectedFile$.next(file);
          } else {
            this.selectedFile$.next(null);
            this._showErrorAlert(
              this._langSvc.instant('Il file non contiene una geometria valida'),
            );
          }
        }),
        catchError(error => {
          this.selectedFile$.next(null);
          this._showErrorAlert(
            this._langSvc.instant('Errore durante la lettura del file, riprova'),
          );
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private _isFileTypeAccepted(file: File): boolean {
    if (this.acceptedFileTypes === '*') return true;

    const acceptedTypes = this.acceptedFileTypes.split(',').map(type => {
      return type.trim().toLowerCase();
    });

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type.toLowerCase();

    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return type === fileExtension;
      } else if (type.endsWith('/*')) {
        return fileType.startsWith(type.replace('/*', '/'));
      } else {
        return type === fileType;
      }
    });
  }

  private _readFileContent(file: File): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();

      reader.onload = e => {
        observer.next(e.target?.result as string);
        observer.complete();
      };

      reader.onerror = e => {
        observer.error(new Error('Errore nella lettura del file'));
      };

      reader.readAsText(file);

      // Cleanup quando l'observable viene unsubscribed
      return () => {
        reader.abort();
      };
    });
  }

  private _showErrorAlert(message: string): void {
    from(
      this._alertCtrl.create({
        header: this._langSvc.instant('Ops!'),
        message,
        buttons: ['OK'],
      }),
    )
      .pipe(switchMap(alert => alert.present()))
      .subscribe();
  }

  private _extractWmFeatureFromFeatureCollection(
    featureCollection: FeatureCollection,
  ): WmFeature<LineString | Point> | null {
    const lineStringGpx = featureCollection?.features?.find(
      feature => feature.geometry?.type === 'LineString',
    ) as WmFeature<LineString>;
    const pointGpx = featureCollection?.features?.find(
      feature => feature.geometry?.type === 'Point',
    ) as WmFeature<Point>;

    return lineStringGpx ?? pointGpx ?? null;
  }

  private _validateAndConvertToWmFeature(
    content: string,
    fileName: string,
  ): WmFeature<LineString | Point> | null {
    const extension = fileName.split('.').pop()?.toLowerCase();
    let geojsonFeature: WmFeature<LineString | Point>;

    try {
      switch (extension) {
        case 'gpx':
          const gpxDoc = new DOMParser().parseFromString(content, 'text/xml');
          const gpxConverted = toGeoJSON.gpx(gpxDoc);
          geojsonFeature = this._extractWmFeatureFromFeatureCollection(gpxConverted);

          if (!geojsonFeature) {
            return null;
          }
          break;

        case 'kml':
          const kmlDoc = new DOMParser().parseFromString(content, 'text/xml');
          const kmlConverted = toGeoJSON.kml(kmlDoc);
          geojsonFeature = this._deserializeKmlProperties(
            this._extractWmFeatureFromFeatureCollection(kmlConverted),
          );
          if (!geojsonFeature) {
            return null;
          }
          break;

        case 'geojson':
          const geojsonParsed = JSON.parse(content);
          geojsonFeature = geojsonParsed;
          break;

        default:
          return null;
      }

      if (!isValidWmFeature(geojsonFeature)) {
        return null;
      }
      this._handleGeometryType(geojsonFeature.geometry);

      return this._deleteUnnecessaryProperties(geojsonFeature);
    } catch (error) {
      return null;
    }
  }
}
