export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = LoginInput & {
  name: string;
};

export type AuthResult = {
  ok: boolean;
  needsConfirmation?: boolean;
};

export type AuthEndpoint = "login" | "signup";

export type OAuthSessionInput = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthSessionStatus = {
  ok: boolean;
  status: number | null;
};
