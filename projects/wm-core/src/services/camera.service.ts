import {Inject, Injectable} from '@angular/core';
import {Capacitor} from '@capacitor/core';
import {
  Camera,
  CameraResultType,
  CameraDirection,
  CameraSource,
  GalleryImageOptions,
  Photo,
  GalleryPhotos,
} from '@capacitor/camera';
import {HttpClient} from '@angular/common/http';
import {IRegisterItem} from '../types/track';
import {Filesystem, Directory, GetUriResult} from '@capacitor/filesystem';
import {GeolocationService} from './geolocation.service';
import {ActionSheetController} from '@ionic/angular';
import {LangService} from '@wm-core/localization/lang.service';
import {Location} from '@wm-core/types/location';
import {DeviceService} from './device.service';
import {Feature, Point} from 'geojson';
import {generateUUID, saveImg} from '@wm-core/utils/localForage';
import {APP_VERSION, APP_ID} from '@wm-core/store/conf/conf.token';
import {Media, MediaProperties, WmDeviceInfo} from '@wm-types/feature';

export interface IPhotoItem extends IRegisterItem {
  blob?: Blob;
  datasrc: string;
  description?: string;
  exif?: any;
  id: string;
  photoURL: string;
  position: Location;
  rawData?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  constructor(
    private _deviceSvc: DeviceService,
    private _http: HttpClient, // private file: File, // private filePath: FilePath,
    private _geoLocationSvc: GeolocationService,
    private _lanSvc: LangService,
    private _actionSheetCtrl: ActionSheetController,
    @Inject(APP_ID) public appId: string,
    @Inject(APP_VERSION) public appVersion: string,
  ) {}

  async addPhotos(): Promise<Feature<Media, MediaProperties>[]> {
    let retProm = new Promise<Feature<Media, MediaProperties>[]>((resolve, reject) => {
      this._actionSheetCtrl
        .create({
          header: this._lanSvc.instant("Origine dell'immagine"),
          buttons: [
            {
              text: this._lanSvc.instant('Scatta una foto'),
              handler: () => {
                this.shotPhoto().then(photo => resolve([photo]));
              },
            },
            {
              text: this._lanSvc.instant('Dalla libreria'),
              handler: () => {
                this.getPhotos(null).then(photos => resolve(photos));
              },
            },
            {
              text: this._lanSvc.instant('Annulla'),
              role: 'cancel',
              handler: () => {
                reject();
              },
            },
          ],
        })
        .then(actionSheet => {
          actionSheet.present();
        });
    });

    return retProm;
  }

  public async getBlob(url: string) {
    let blob: Blob, arrayBuffer: ArrayBuffer, blobType: string;
    const rawData = JSON.parse(await this.getPhotoData(url)) ?? null;
    if (rawData) {
      if (rawData.arrayBuffer) arrayBuffer = new Uint8Array(rawData.arrayBuffer).buffer;
      if (rawData.blobType) blobType = rawData.blobType;
    }

    if (!!arrayBuffer) {
      blob = new Blob([arrayBuffer]);
      blob = blob.slice(0, blob.size, blobType);
    }
    return blob;
  }

  public async getPhotoData(photoUrl: string): Promise<string> {
    const blob = await this._http
      .get(Capacitor.convertFileSrc(photoUrl), {responseType: 'blob'})
      .toPromise();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(blob);
      reader.onloadend = () => {
        resolve(
          JSON.stringify({
            arrayBuffer: Array.from(new Uint8Array(<ArrayBuffer>reader.result)),
            blobType: blob.type,
          }),
        );
      };
      reader.onerror = reject;
    });
  }

  /**
   * Return the photo blob to send
   *
   * @param {IPhotoItem} photo
   *
   * @returns {Blob} the blob
   */
  public async getPhotoFile(photo: IPhotoItem): Promise<Blob> {
    let blob: Blob, arrayBuffer: ArrayBuffer, blobType: string;
    if (photo === null) return null;
    if (photo.rawData) {
      let rawData = JSON.parse(photo.rawData);
      if (rawData.arrayBuffer) arrayBuffer = new Uint8Array(rawData.arrayBuffer).buffer;
      if (rawData.blobType) blobType = rawData.blobType;
    }

    if (!!arrayBuffer) {
      blob = new Blob([arrayBuffer]);
      blob = blob.slice(0, blob.size, blobType);
    } else {
      try {
        blob = await this._http.get(photo.photoURL, {responseType: 'blob'}).toPromise();
      } catch (err) {
        throw err;
      }
    }
    return blob;
  }

  async getPhotos(dateLimit: Date = null): Promise<Feature<Point, MediaProperties>[]> {
    const res: Feature<Media, MediaProperties>[] = [];
    let filePath = null;
    const location = this._geoLocationSvc.location;
    const device = await this._deviceSvc.getInfo();
    if (!this._deviceSvc.isBrowser) {
      if (!(await Camera.checkPermissions())) {
        await Camera.requestPermissions();
        if (!(await Camera.checkPermissions())) return res;
      }
      const options: GalleryImageOptions = {
        quality: 100, //	number	The quality of image to return as JPEG, from 0-100		1.2.0
        // width:	10000, //number	The width of the saved image		1.2.0
        // height:10000,	//number	The height of the saved image		1.2.0
        // correctOrientation: false, // 	boolean	Whether to automatically rotate the image “up” to correct for orientation in portrait mode	: true	1.2.0
        // presentationStyle:	'fullscreen' | 'popover'	// iOS only: The presentation style of the Camera.	: 'fullscreen'	1.2.0
        // limit : 100 //	number	iOS only: Maximum number of pictures the user will be able to choose.	0 (unlimited)	1.2.0
      };
      const gallery: GalleryPhotos = await Camera.pickImages(options);
      for (let i = 0; i < gallery.photos.length; i++) {
        const feature: Feature<Media, MediaProperties> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          properties: {
            ...gallery.photos[i],
            date: new Date(),
            uuid: generateUUID(),
            app_id: this.appId,
            photo: gallery.photos[i],
            device,
          },
        };
        res.push(feature);
      }
      return res;
    } else {
      const max = 1 + Math.random() * 8;
      for (let i = 0; i < max; i++) {
        const fakePhoto: Photo = {
          webPath: `https://picsum.photos/50${i}/75${i}`,
          saved: false,
          format: 'image/jpeg',
        };
        const fakeFeature: Feature<Media, MediaProperties> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          properties: {
            date: new Date(),
            uuid: generateUUID(),
            app_id: this.appId,
            photo: fakePhoto,
            device,
          },
        };
        res.push(fakeFeature);
      }
      return res;
    }
  }

  /**
   * Copy the photo to a local stable directory
   *
   * @param photo the photo to save
   *
   * @returns {Promise<string>} with the new photo location
   */
  public async savePhotoToDataDirectory(photo: IPhotoItem): Promise<string> {
    let split: Array<string> = photo.photoURL.split('/'),
      filename: string = split.pop(),
      directoryExists: boolean = false;
    // TODO: Understand how to copy the file from a http url
    if (photo.photoURL.substring(0, 4) !== 'file' && photo.photoURL[0] !== '/')
      return photo.photoURL;

    if (this._deviceSvc.isIos && photo.photoURL[0] === '/')
      photo.photoURL = 'file://' + photo.photoURL;

    try {
      await Filesystem.readdir({
        path: UGC_MEDIA_DIRECTORY,
        directory: Directory.Data,
      });
      directoryExists = true;
    } catch (e) {
      directoryExists = false;
    }

    if (!directoryExists) {
      await Filesystem.mkdir({
        path: UGC_MEDIA_DIRECTORY,
        directory: Directory.Data,
        recursive: true,
      });
    }

    await Filesystem.copy({
      from: photo.photoURL,
      to: UGC_MEDIA_DIRECTORY + '/' + filename,
      toDirectory: Directory.Data,
    });

    const uriResult: GetUriResult = await Filesystem.getUri({
      path: UGC_MEDIA_DIRECTORY + '/' + filename,
      directory: Directory.Data,
    });

    return Capacitor.convertFileSrc(uriResult.uri);
  }

  public async setPhotoData(photo: IPhotoItem): Promise<void> {
    if (photo == null) return;
    if (!photo.rawData) photo.rawData = JSON.stringify({});
    try {
      let rawData = JSON.parse(photo.rawData);
      if (!rawData?.arrayBuffer)
        photo.rawData = await this.getPhotoData(photo.photoURL ? photo.photoURL : photo.datasrc);
      photo.blob = await this.getPhotoFile(photo);
    } catch (e) {
      console.log('Error setting photo blob', e);
    }
  }

  async shotPhoto(): Promise<Feature<Media, MediaProperties>> {
    if (!this._geoLocationSvc.active) await this._geoLocationSvc.start();
    const photo: Photo = await Camera.getPhoto({
      quality: 90,
      // allowEditing: true,
      resultType: CameraResultType.Uri,
      saveToGallery: true, //boolean	Whether to save the photo to the gallery. If the photo was picked from the gallery, it will only be saved if edited. Default: false
      // width: 10000,//	number	The width of the saved image
      // height: 10000,//	number	The height of the saved image
      // preserveAspectRatio: true, //	boolean	Whether to preserve the aspect ratio of the image.If this flag is true, the width and height will be used as max values and the aspect ratio will be preserved.This is only relevant when both a width and height are passed.When only width or height is provided the aspect ratio is always preserved(and this option is a no- op).A future major version will change this behavior to be default, and may also remove this option altogether.Default: false
      // correctOrientation: true,	//boolean	Whether to automatically rotate the image “up” to correct for orientation in portrait mode Default: true
      source: CameraSource.Camera, //CameraSource	The source to get the photo from.By default this prompts the user to select either the photo album or take a photo.Default: CameraSource.Prompt
      direction: CameraDirection.Rear, //CameraDirection	iOS and Web only: The camera direction.Default: CameraDirection.Rear
      // presentationStyle: 'fullscreen',	//"fullscreen" | "popover"	iOS only: The presentation style of the Camera.Defaults to fullscreen.
      webUseInput: this._deviceSvc.isBrowser ? null : true, //boolean	Web only: Whether to use the PWA Element experience or file input.The default is to use PWA Elements if installed and fall back to file input.To always use file input, set this to true.Learn more about PWA Elements: https://capacitorjs.com/docs/pwa-elements
      promptLabelHeader: this._lanSvc.instant("Origine dell'immagine"), //string	If use CameraSource.Prompt only, can change Prompt label.default: promptLabelHeader: ‘Photo’ // iOS only promptLabelCancel : ‘Cancel’ // iOS only promptLabelPhoto : ‘From Photos’ promptLabelPicture : ‘Take Picture’
      promptLabelCancel: this._lanSvc.instant('Annulla'), //string
      promptLabelPhoto: this._lanSvc.instant('Dalla libreria'), //string
      promptLabelPicture: this._lanSvc.instant('Scatta una foto'), //string
    });
    if (photo.webPath) {
      await saveImg(photo.webPath);
    }
    const location = this._geoLocationSvc.location;
    const device = await this._deviceSvc.getInfo();
    const feature: Feature<Media, MediaProperties> = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      properties: {
        date: new Date(),
        uuid: generateUUID(),
        app_id: this.appId,
        device,
        photo,
      },
    };
    return feature;
  }
}

export const UGC_MEDIA_DIRECTORY: string = 'ugc_media';
