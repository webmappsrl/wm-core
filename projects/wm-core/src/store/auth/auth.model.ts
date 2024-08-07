interface IUser {
  id: number;
  email?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  token: string;
}

interface IGeohubApiLogin {
  id: number;
  email?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  role?: string;
  access_token: string;
}
