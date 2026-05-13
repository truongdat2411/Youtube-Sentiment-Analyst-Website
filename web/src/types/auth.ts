export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserRead {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}
