export interface ShareConfig {
  cid: string;
  expiresIn?: number;
  password?: string;
  allowedUsers?: string[];
  isPublic: boolean;
}

export interface ShareInfo {
  cid: string;
  filename?: string;
  size?: number;
  password?: string;
  expiry?: string;
  hasPassword: boolean;
}
