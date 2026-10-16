import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewEncapsulation, OnDestroy} from '@angular/core';
import {Photo} from '@capacitor/camera';
import {Md5} from 'ts-md5';
import {CameraService, CaptureOptions} from '@wm-core/services/camera.service';
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {Media} from '@wm-types/feature';
import {MAX_PHOTOS} from '@wm-core/constants/media';
import {Store} from '@ngrx/store';
import {deleteUgcMedia} from '@wm-core/store/features/ugc/ugc.actions';
import {DeviceService} from '@wm-core/services/device.service';

@Component({
  standalone: false,
  selector: 'wm-image-picker',
  templateUrl: './image-picker.component.html',
  styleUrls: ['./image-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WmImagePickerComponent implements OnDestroy {
  @Output() photosChanged = new EventEmitter<Photo[]>();
  @Output() startAddPhotos = new EventEmitter<void>();
  @Output() endAddPhotos = new EventEmitter<void>();
  @Input() maxPhotos = MAX_PHOTOS;
  /** Opzioni di acquisizione (oc:8166); `null` mantiene il comportamento di default. */
  @Input() captureOptions: CaptureOptions | null = null;
  @Input() set synchronizedPhotos(synchronizedPhotos: Media[]) {
    this._synchronizedPhotos$.next(synchronizedPhotos);
  }

  private _synchronizedPhotos$ = new BehaviorSubject<Media[]>([]);
  private _localPhotos$ = new BehaviorSubject<Media[]>([]);
  private _combinedPhotosSubscription$: Subscription;
  
  isMobile$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._deviceSvc.isMobile);
  photos: BehaviorSubject<Media[]> = new BehaviorSubject<Media[]>([]);

  constructor(private _cameraSvc: CameraService, private _cdr: ChangeDetectorRef, private _store: Store, private _deviceSvc: DeviceService) {
    this._combinedPhotosSubscription$ = combineLatest([
      this._localPhotos$,
      this._synchronizedPhotos$
    ]).pipe(
      map(([localPhotos, synchronizedPhotos]) => [...localPhotos, ...synchronizedPhotos])
    ).subscribe(combinedPhotos => {
      this.photos.next(combinedPhotos);
      this.photosChanged.emit(combinedPhotos);
    });
  }

  /**
   * Aggiunge foto dalla galleria senza mai superare `maxPhotos`, contando anche le foto già
   * sincronizzate. Il controllo sulla lunghezza avviene al momento dell'inserimento, leggendo il
   * valore corrente: con la selezione multipla più elementi vengono elaborati in parallelo, e uno
   * snapshot letto prima degli `await` faceva perdere foto o superare il limite (oc:8166).
   * `endAddPhotos` viene emesso anche se l'utente annulla la galleria.
   */
  async addPhotosFromLibrary(): Promise<void> {
    this.startAddPhotos.emit();
    try {
      const freeSlots = this.maxPhotos - this._totalPhotos();
      if (freeSlots <= 0) return;
      const {maxWidth, quality} = this.captureOptions ?? {};
      const library = await this._cameraSvc.getPhotos(null, {
        limit: freeSlots,
        ...(maxWidth != null && {width: maxWidth}),
        ...(quality != null && {quality}),
      });

      await Promise.all(
        library.map(async libraryItem => {
          const libraryItemCopy = Object.assign({selected: false}, libraryItem);
          const photoData = await this._cameraSvc.getPhotoData(libraryItemCopy.webPath);
          const md5 = Md5.hashStr(JSON.stringify(photoData));
          const exists = await this._isDuplicate(md5);
          if (!exists && this._totalPhotos() < this.maxPhotos) {
            this._localPhotos$.next([...this._localPhotos$.value, libraryItemCopy]);
          }
        }),
      );
    } catch (e) {
      // l'utente ha annullato la galleria: nessuna foto da aggiungere
    } finally {
      this.endAddPhotos.emit();
    }
  }

  /**
   * Scatta una foto e la aggiunge, solo se c'è ancora posto (oc:8166).
   */
  async takePhoto(): Promise<void> {
    if (this._totalPhotos() >= this.maxPhotos) return;
    const {maxWidth, ...shotOptions} = this.captureOptions ?? {};
    const photo = await this._cameraSvc.shotPhoto(maxWidth, shotOptions);
    if (this._totalPhotos() < this.maxPhotos) {
      this._localPhotos$.next([...this._localPhotos$.value, photo]);
    }
  }

  remove(idx: number, media: Media): void {
    if (idx > -1) {
      if (media.id) {
        this._store.dispatch(deleteUgcMedia({media}));
      } else {
        const currentLocalPhotos = this._localPhotos$.value;
        this._localPhotos$.next(
          currentLocalPhotos.filter((_, i) => i !== idx)
        );
      }
    }
  }

  /**
   * Numero di foto nel picker, locali e già sincronizzate: è quello che conta per `maxPhotos`.
   *
   * @returns Il numero totale di foto.
   */
  private _totalPhotos(): number {
    return this._localPhotos$.value.length + (this._synchronizedPhotos$.value?.length ?? 0);
  }

  /**
   * Indica se fra le foto locali ne esiste già una con lo stesso hash dei dati.
   *
   * @param md5 Hash dei dati della foto candidata.
   */
  private async _isDuplicate(md5: string): Promise<boolean> {
    for (const p of this._localPhotos$.value) {
      if (p.id) {
        continue;
      }
      const pData = await this._cameraSvc.getPhotoData(p.webPath);
      if (Md5.hashStr(JSON.stringify(pData)) === md5) {
        return true;
      }
    }
    return false;
  }

  ngOnDestroy(): void {
    if (this._combinedPhotosSubscription$) {
      this._combinedPhotosSubscription$.unsubscribe();
    }
  }
}
