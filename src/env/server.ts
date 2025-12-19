import { z } from "zod";

const serverEnvSchema = z.object({
  // Server-side environment variables
  NODE_ENV: z.enum(["development", "test", "production"]),
  ADMIN_EMAIL: z.string().min(1),
  ADMIN_ID: z.string().min(1),
  JWT_SECRET_KEY: z.string().min(1),
  DANGEROUS_DBCOMMAND_PASSWORD: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET_NAME: z.string().min(1),
  _AWS_ACCESS_KEY: z.string().min(1),
  _AWS_SECRET_KEY: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  EMAIL_SERVER: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  SENDINBLUE_KEY: z.string().min(1),
  TURSO_DB_URL: z.string().min(1),
  TURSO_DB_TOKEN: z.string().min(1),
  TURSO_LINEAGE_URL: z.string().min(1),
  TURSO_LINEAGE_TOKEN: z.string().min(1),
  TURSO_DB_API_TOKEN: z.string().min(1),
  LINEAGE_OFFLINE_SERIALIZATION_SECRET: z.string().min(1),
  GITEA_URL: z.string().min(1),
  GITEA_TOKEN: z.string().min(1),
  GITHUB_API_TOKEN: z.string().min(1),
  VITE_DOMAIN: z.string().min(1),
  VITE_AWS_BUCKET_STRING: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE: z.string().min(1),
  VITE_GITHUB_CLIENT_ID: z.string().min(1),
  VITE_WEBSOCKET: z.string().min(1)
});

// Type inference
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Validation function for server-side with detailed error messages
export const validateServerEnv = (
  envVars: Record<string, string | undefined>
): ServerEnv => {
  try {
    return serverEnvSchema.parse(envVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.format();
      const missingVars = Object.entries(formattedErrors)
        .filter(
          ([key, value]) =>
            key !== "_errors" &&
            typeof value === "object" &&
            value._errors?.length > 0 &&
            value._errors[0] === "Required"
        )
        .map(([key, _]) => key);

      const invalidVars = Object.entries(formattedErrors)
        .filter(
          ([key, value]) =>
            key !== "_errors" &&
            typeof value === "object" &&
            value._errors?.length > 0 &&
            value._errors[0] !== "Required"
        )
        .map(([key, value]) => ({
          key,
          error: value._errors[0]
        }));

      let errorMessage = "Environment validation failed:\n";

      if (missingVars.length > 0) {
        errorMessage += `Missing required variables: ${missingVars.join(", ")}\n`;
      }

      if (invalidVars.length > 0) {
        errorMessage += "Invalid values:\n";
        invalidVars.forEach(({ key, error }) => {
          errorMessage += `  ${key}: ${error}\n`;
        });
      }

      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    console.error("Environment validation failed with unknown error:", error);
    throw new Error("Environment validation failed with unknown error");
  }
};

// Validate and export environment variables directly
// This happens once at module load time on the server
const validateAndExportEnv = (): ServerEnv => {
  try {
    const validated = validateServerEnv(process.env);
    console.log("✅ Environment validation successful");
    return validated;
  } catch (error) {
    console.error("❌ Environment validation failed:", error);
    throw error;
  }
};

export const env = validateAndExportEnv();

// Helper function to check if a variable is missing
export const isMissingEnvVar = (varName: string): boolean => {
  return !process.env[varName] || process.env[varName]?.trim() === "";
};

// Helper function to get all missing server environment variables
export const getMissingEnvVars = (): string[] => {
  const requiredServerVars = [
    "NODE_ENV",
    "ADMIN_EMAIL",
    "ADMIN_ID",
    "JWT_SECRET_KEY",
    "DANGEROUS_DBCOMMAND_PASSWORD",
    "AWS_REGION",
    "AWS_S3_BUCKET_NAME",
    "_AWS_ACCESS_KEY",
    "_AWS_SECRET_KEY",
    "GOOGLE_CLIENT_SECRET",
    "GITHUB_CLIENT_SECRET",
    "EMAIL_SERVER",
    "EMAIL_FROM",
    "SENDINBLUE_KEY",
    "TURSO_DB_URL",
    "TURSO_DB_TOKEN",
    "TURSO_LINEAGE_URL",
    "TURSO_LINEAGE_TOKEN",
    "TURSO_DB_API_TOKEN",
    "LINEAGE_OFFLINE_SERIALIZATION_SECRET",
    "GITEA_URL",
    "GITEA_TOKEN",
    "GITHUB_API_TOKEN",
    "VITE_DOMAIN",
    "VITE_AWS_BUCKET_STRING",
    "VITE_GOOGLE_CLIENT_ID",
    "VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE",
    "VITE_GITHUB_CLIENT_ID",
    "VITE_WEBSOCKET"
  ];

  return requiredServerVars.filter((varName) => isMissingEnvVar(varName));
};
