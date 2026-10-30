export interface TrackerConfig {
  internalToken: string;
}

function requireVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

// NFR-SEC-005: secrets come only from the environment. The gateway verifies the JWT; the tracker
// only needs the shared internal token (SDS §2.2).
export function loadConfig(): TrackerConfig {
  return { internalToken: requireVariable('INTERNAL_TOKEN') };
}
