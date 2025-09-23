
export interface IUser {
  id: number;
  email?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  access_token: string;
  privacy_consent?: boolean;
  privacy_consent_date?: string;
}

export interface ILogoutResponse extends IUser {
  message: string;
}
