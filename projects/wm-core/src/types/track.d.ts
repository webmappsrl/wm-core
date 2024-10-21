import {StringMap} from '@angular/compiler/src/compiler_facade_interface';
import {Feature, LineString} from 'geojson';

export interface IRegisterItem {
  date: Date;
  key?: string;
  sync_id?: any;
  uuid?: any;
}

export interface ITrack extends IRegisterItem {
  activity: string;
  description?: string;
  geojson?: Feature<LineString>;
  id?: string;
  metadata?: any;
  photoKeys: string[];
  photos: IPhotoItem[];
  rawData?: any;
  storedPhotoKeys?: string[];
  title: string;
}
