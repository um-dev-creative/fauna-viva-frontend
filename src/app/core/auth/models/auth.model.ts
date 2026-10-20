/** The signed-in person, as the BFF answers it (never a token: those live in httpOnly cookies). */
export interface AuthUser {
  id: string;
  username: string;
  firstname?: string;
  lastname?: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  alias: string;
  email: string;
  password: string;
  displayName?: string;
  language?: string;
  person: { firstName?: string; lastName?: string };
}
