export interface User {
  id: string;
  passwordHash: string;
  lastLogin?: string;
  loginAttempts?: number;
  lockedUntil?: number;
}

export interface Session {
  token: string;
  expiresAt: number;
  userId: string;
}
