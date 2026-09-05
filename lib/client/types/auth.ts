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
