export interface IUser {
  id: number;
  email?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  access_token: string;
  properties?: {
    privacy?: Privacy[];
  };
}

export interface ILogoutResponse extends IUser {
  message: string;
}
export interface Privacy {
  agree: boolean;
  date: string;
  app_id: number;
}
