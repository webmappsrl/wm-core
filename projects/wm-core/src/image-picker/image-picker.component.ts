import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
import {Photo} from '@capacitor/camera';
import {Md5} from 'ts-md5';
import {CameraService} from '@wm-core/services/camera.service';
import {BehaviorSubject} from 'rxjs';
import {UntypedFormGroup} from '@angular/forms';

@Component({
  selector: 'wm-image-picker',
  templateUrl: './image-picker.component.html',
  styleUrls: ['./image-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WmImagePickerComponent {
  @Output() photosChanged = new EventEmitter<Photo[]>();
  @Output() startAddPhotos = new EventEmitter<void>();
  @Output() endAddPhotos = new EventEmitter<void>();

  fg: UntypedFormGroup;
  photos: BehaviorSubject<Photo[]> = new BehaviorSubject<Photo[]>([]);
  maxPhotos = 3;

  constructor(private _cameraSvc: CameraService, private _cdr: ChangeDetectorRef) {}

  async addPhotosFromLibrary(): Promise<void> {
    this.startAddPhotos.emit();
    const library = await this._cameraSvc.getPhotos();

    await Promise.all(
      library.map(async libraryItem => {
        const libraryItemCopy = Object.assign({selected: false}, libraryItem);
        const photoData = await this._cameraSvc.getPhotoData(libraryItemCopy.webPath);
        const md5 = Md5.hashStr(JSON.stringify(photoData));

        let exists: boolean = false;
        for (let p of this.photos.value) {
          const pData = await this._cameraSvc.getPhotoData(p.webPath);
          const pictureMd5 = Md5.hashStr(JSON.stringify(pData));
          if (md5 === pictureMd5) {
            exists = true;
            break;
          }
        }

        if (this.photos.value.length < this.maxPhotos && !exists) {
          this.photos.next([...this.photos.value, libraryItemCopy]);
          this.photosChanged.emit(this.photos.value);
        }
      }),
    );

    this.endAddPhotos.emit();
    this._cdr.detectChanges(); // Forza il refresh della view per abilitare il pulsante di salvataggio
  }

  async takePhoto(): Promise<void> {
    const photo = await this._cameraSvc.shotPhoto();
    this.photos.next([...this.photos.value, photo]);
    this.photosChanged.emit(this.photos.value);
  }

  remove(idx: number): void {
    if (idx > -1) {
      this.photos.next(this.photos.value.filter((_, i) => i !== idx));
      this.photosChanged.emit(this.photos.value);
    }
  }
}
