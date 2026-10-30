export interface AuthConfig {
  jwtSecret: string;
  internalToken: string;
  secureCookies: boolean;
}

function requireVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

// NFR-SEC-005: secrets come only from the environment.
export function loadConfig(): AuthConfig {
  return {
    jwtSecret: requireVariable('JWT_SECRET'),
    internalToken: requireVariable('INTERNAL_TOKEN'),
    secureCookies: process.env.NODE_ENV === 'production',
  };
}
