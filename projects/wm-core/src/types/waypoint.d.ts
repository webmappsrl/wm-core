import {Nominatim} from '../services/nominatim.service';
import {IPhotoItem} from '../services/camera.service';
import {IRegisterItem} from './track';
import {Location} from 'src/app/types/location';

export interface WaypointSave extends IRegisterItem {
  city: string;
  date: Date;
  description: string;
  displayPosition: Location;
  formId?: string;
  id?: string;
  nominatim?: Nominatim;
  photoKeys?: Array<string>;
  photos?: Array<IPhotoItem>;
  position: Location;
  storedPhotoKeys?: string[];
  sync_id?: any;
  title: string;
  waypointtype: string;
}
