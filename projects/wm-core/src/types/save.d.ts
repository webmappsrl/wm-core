import { ESaveObjType } from "./save.enum";


export interface ISaveIndexObj {
  key: string;
  type: ESaveObjType;
  saved: boolean;
  edited: boolean;
  deleted?: boolean;
}
