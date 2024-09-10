import {StringMap} from '@angular/compiler/src/compiler_facade_interface';
import { CGeojsonLineStringFeature } from 'wm-core/classes/features/cgeojson-line-string-feature';

export interface IRegisterItem {
  date: Date;
  key?: string;
  sync_id?:any;
  uuid?: any;
}

export interface ITrack extends IRegisterItem {
  activity: string;
  description?: string;
  geojson?: CGeojsonLineStringFeature;
  id?: string;
  metadata?: any;
  photoKeys: string[];
  photos: IPhotoItem[];
  rawData?: any;
  storedPhotoKeys?: string[];
  title: string;
}
