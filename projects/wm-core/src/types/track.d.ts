export interface IRegisterItem {
  date: Date;
  key?: string;
}

export interface ITrack extends IRegisterItem {
  geojson?: any;
  photos: any[];
  photoKeys: string[];
  title: string;
  description?: string;
  activity: string;
  id?: string;
}
