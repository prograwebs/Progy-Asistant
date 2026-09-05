export type ProgyUser = {
  id: string;
  email: string;
  name: string;
};

export type SupabaseSessionPayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
};

export type SupabaseUserPayload = {
  id?: unknown;
  email?: unknown;
  user_metadata?: {
    full_name?: unknown;
    name?: unknown;
  };
};
