export interface ClientEnv {
  VITE_DOMAIN: string;
  VITE_AWS_BUCKET_STRING: string;
  VITE_DOWNLOAD_BUCKET_STRING: string;
  VITE_GOOGLE_CLIENT_ID: string;
  VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE: string;
  VITE_GITHUB_CLIENT_ID: string;
  VITE_WEBSOCKET: string;
  VITE_INFILL_ENDPOINT: string;
  VITE_TURNSTILE_SITE_KEY: string
}

const requiredKeys: (keyof ClientEnv)[] = [
  "VITE_DOMAIN",
  "VITE_AWS_BUCKET_STRING",
  "VITE_DOWNLOAD_BUCKET_STRING",
  "VITE_GOOGLE_CLIENT_ID",
  "VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE",
  "VITE_GITHUB_CLIENT_ID",
  "VITE_WEBSOCKET",
  "VITE_INFILL_ENDPOINT",
  "VITE_TURNSTILE_SITE_KEY"
];

export const validateClientEnv = (
  envVars: Record<string, string | undefined>
): ClientEnv => {
  const missing = requiredKeys.filter(
    (key) => !envVars[key] || envVars[key]!.trim() === ""
  );

  if (missing.length > 0) {
    const message = `Client environment validation failed:\nMissing required variables: ${missing.join(", ")}`;
    console.error(message);
    throw new Error(message);
  }

  return envVars as unknown as ClientEnv;
};

export const env = validateClientEnv(import.meta.env);

export const isMissingEnvVar = (varName: string): boolean => {
  return !import.meta.env[varName] || import.meta.env[varName]?.trim() === "";
};

export const getMissingEnvVars = (): string[] => {
  return requiredKeys.filter((varName) => isMissingEnvVar(varName));
};
