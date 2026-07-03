import {Media} from '@wm-types/feature';

/**
 * Base class shared by UgcPoiPropertiesComponent and UgcTrackPropertiesComponent
 * to hold the photo list edited via wm-image-picker.
 */
export abstract class UgcPropertiesBaseComponent {
  protected _photos: Media[] = [];

  /**
   * Photos ready to be merged into the update payload.
   */
  protected get photos(): Media[] {
    return this._photos;
  }

  /**
   * Handler for wm-image-picker's (photosChanged) output.
   */
  photosChanged(photos: Media[]): void {
    this._photos = photos;
  }
}
