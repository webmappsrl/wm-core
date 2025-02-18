import {
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import {UntypedFormGroup} from '@angular/forms';
import {AlertController, ModalController} from '@ionic/angular';
import {Store} from '@ngrx/store';
import {confGeohubId, confMAP, confTRACKFORMS} from '@wm-core/store/conf/conf.selector';
import {WmFeature, WmProperties} from '@wm-types/feature';
import {Feature, LineString} from 'geojson';
import {BehaviorSubject, combineLatest, EMPTY, from, Observable} from 'rxjs';
import * as toGeoJSON from '@tmcw/togeojson';
import {catchError, map, switchMap, take} from 'rxjs/operators';
import {DeviceService} from '@wm-core/services/device.service';
import {LangService} from '@wm-core/localization/lang.service';
import {saveUgcTrack} from '@wm-core/utils/localForage';
import {generateUUID} from '@wm-core/utils/localForage';
import {syncUgcTracks} from '@wm-core/store/features/ugc/ugc.actions';

@Component({
  selector: 'wm-modal-ugc-track-uploader',
  templateUrl: './modal-ugc-track-uploader.component.html',
  styleUrls: ['./modal-ugc-track-uploader.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ModalUgcTrackUploaderComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  acceptedFileTypes: string = '.gpx,.kml,.geojson,application/gpx+xml,application/octet-stream';
  confMap$: Observable<any> = this._store.select(confMAP);
  confTRACKFORMS$: Observable<any[]> = this._store.select(confTRACKFORMS);
  formGroup$: BehaviorSubject<UntypedFormGroup> = new BehaviorSubject<UntypedFormGroup>(null);
  geohubId$: Observable<number> = this._store.select(confGeohubId);
  isDragging$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  selectedFile$: BehaviorSubject<File | null> = new BehaviorSubject<File | null>(null);
  ugcTrack$: BehaviorSubject<WmFeature<LineString> | null> =
    new BehaviorSubject<WmFeature<LineString> | null>(null);
  isUploadDisabled$: Observable<boolean>;
  constructor(
    private _store: Store,
    private _modalCtrl: ModalController,
    private _deviceSvc: DeviceService,
    private _langSvc: LangService,
    private _alertCtrl: AlertController,
  ) {
    this.isUploadDisabled$ = combineLatest([this.selectedFile$, this.formGroup$]).pipe(
      map(([selectedFile, fg]) => {
        const isInvalid = fg?.invalid;
        return !selectedFile || isInvalid;
      }),
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
    this.ugcTrack$.next(null);
  }
  setForm(form: UntypedFormGroup): void {
    this.formGroup$.next(form);
  }

  upload(): void {
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
                  device,
                };
                this.ugcTrack$.next({
                  ...this.ugcTrack$.value,
                  properties: {
                    ...this.ugcTrack$.value?.properties,
                    ...properties,
                  },
                });
                return this.ugcTrack$.value;
              }),
            ),
          ),
          switchMap(feature => saveUgcTrack(feature)),
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
        .subscribe(() => this._store.dispatch(syncUgcTracks()));
    }
  }

  private _deleteUnnecessaryProperties(feature: WmFeature<LineString>): WmFeature<LineString> {
    if (feature.properties) {
      delete feature.properties.id;
      delete feature.properties.uuid;
      delete feature.properties.image_gallery;
    }
    return feature;
  }

  private _deserializeProperties(feature: Feature): Feature {
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
            this.ugcTrack$.next(result);
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

  private _isValidGeoJsonFeature(data: any): boolean {
    return (
      data &&
      data.type === 'Feature' &&
      data.geometry &&
      data.geometry.type === 'LineString' &&
      Array.isArray(data.geometry.coordinates) &&
      data.geometry.coordinates.length > 0
    );
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

  private _validateAndConvertToWmFeature(
    content: string,
    fileName: string,
  ): WmFeature<LineString> | null {
    const extension = fileName.split('.').pop()?.toLowerCase();
    let geojsonFeature: WmFeature<LineString>;

    try {
      switch (extension) {
        case 'gpx':
          const gpxDoc = new DOMParser().parseFromString(content, 'text/xml');
          const gpxConverted = toGeoJSON.gpx(gpxDoc);
          // Cerca la prima feature con geometria LineString
          const lineStringGpx = gpxConverted?.features?.find(
            feature => feature.geometry?.type === 'LineString',
          );
          if (lineStringGpx) {
            geojsonFeature = lineStringGpx as WmFeature<LineString>;
          } else {
            return null;
          }
          break;

        case 'kml':
          const kmlDoc = new DOMParser().parseFromString(content, 'text/xml');
          const kmlConverted = toGeoJSON.kml(kmlDoc);
          const lineStringKml = kmlConverted?.features?.find(
            feature => feature.geometry?.type === 'LineString',
          );
          if (lineStringKml) {
            geojsonFeature = this._deserializeProperties(lineStringKml) as WmFeature<LineString>;
          } else {
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

      if (!this._isValidGeoJsonFeature(geojsonFeature)) {
        return null;
      }

      return this._deleteUnnecessaryProperties(geojsonFeature);
    } catch (error) {
      return null;
    }
  }
}
