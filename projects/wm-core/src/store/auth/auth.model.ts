export interface IUser {
  id: number;
  email?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  access_token: string;
  properties?: {
    privacy?: Array<{
      agree: boolean;
      date: string;
      app_id: number;
      user_id: number;
    }>;
  };
}

export interface ILogoutResponse extends IUser {
  message: string;
}
