export interface IUser {
  id: number;
  email?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  access_token: string;
  privacy_agree?: boolean;
  privacy_agree_date?: string;
}

export interface ILogoutResponse extends IUser {
  message: string;
}
