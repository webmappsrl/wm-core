import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewEncapsulation, OnDestroy} from '@angular/core';
import {Photo} from '@capacitor/camera';
import {Md5} from 'ts-md5';
import {CameraService} from '@wm-core/services/camera.service';
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {Media} from '@wm-types/feature';
import {MAX_PHOTOS} from '@wm-core/constants/media';
import {Store} from '@ngrx/store';
import {deleteUgcMedia} from '@wm-core/store/features/ugc/ugc.actions';
import {DeviceService} from '@wm-core/services/device.service';

@Component({
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

  async addPhotosFromLibrary(): Promise<void> {
    this.startAddPhotos.emit();
    const library = await this._cameraSvc.getPhotos();

    await Promise.all(
      library.map(async libraryItem => {
        const libraryItemCopy = Object.assign({selected: false}, libraryItem);
        const photoData = await this._cameraSvc.getPhotoData(libraryItemCopy.webPath);
        const md5 = Md5.hashStr(JSON.stringify(photoData));

        let exists: boolean = false;
        const currentLocalPhotos = this._localPhotos$.value;
        for (let p of currentLocalPhotos) {
          if (p.id) {
            continue;
          }
          const pData = await this._cameraSvc.getPhotoData(p.webPath);
          const pictureMd5 = Md5.hashStr(JSON.stringify(pData));
          if (md5 === pictureMd5) {
            exists = true;
            break;
          }
        }

        if (currentLocalPhotos.length < this.maxPhotos && !exists) {
          this._localPhotos$.next([...currentLocalPhotos, libraryItemCopy]);
        }
      }),
    );

    this.endAddPhotos.emit();
  }

  async takePhoto(): Promise<void> {
    const photo = await this._cameraSvc.shotPhoto();
    const currentLocalPhotos = this._localPhotos$.value;
    this._localPhotos$.next([...currentLocalPhotos, photo]);
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

  ngOnDestroy(): void {
    if (this._combinedPhotosSubscription$) {
      this._combinedPhotosSubscription$.unsubscribe();
    }
  }
}
