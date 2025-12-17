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
  // Client-side variables accessible on server
  VITE_DOMAIN: z.string().min(1).optional(),
  VITE_AWS_BUCKET_STRING: z.string().min(1).optional(),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE: z.string().min(1).optional(),
  VITE_GITHUB_CLIENT_ID: z.string().min(1).optional(),
  VITE_WEBSOCKET: z.string().min(1).optional(),
  // Aliases for backward compatibility
  NEXT_PUBLIC_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_AWS_BUCKET_STRING: z.string().min(1).optional(),
  NEXT_PUBLIC_GITHUB_CLIENT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID_MAGIC_DELVE: z.string().min(1).optional(),
});

const clientEnvSchema = z.object({
  // Client-side environment variables (using VITE_ prefix for SolidStart)
  VITE_DOMAIN: z.string().min(1),
  VITE_AWS_BUCKET_STRING: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE: z.string().min(1),
  VITE_GITHUB_CLIENT_ID: z.string().min(1),
  VITE_WEBSOCKET: z.string().min(1),
});

// Combined environment schema
export const envSchema = z.object({
  server: serverEnvSchema,
  client: clientEnvSchema,
});

// Type inference
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Custom error class for better error handling
class EnvironmentError extends Error {
  constructor(
    message: string,
    public errors?: z.ZodFormattedError<any>,
  ) {
    super(message);
    this.name = "EnvironmentError";
  }
}

// Validation function for server-side with detailed error messages
export const validateServerEnv = (
  envVars: Record<string, string | undefined>,
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
            value._errors[0] === "Required",
        )
        .map(([key, _]) => key);

      const invalidVars = Object.entries(formattedErrors)
        .filter(
          ([key, value]) =>
            key !== "_errors" &&
            typeof value === "object" &&
            value._errors?.length > 0 &&
            value._errors[0] !== "Required",
        )
        .map(([key, value]) => ({
          key,
          error: value._errors[0],
        }));

      let errorMessage = "Environment validation failed:\n";

      if (missingVars.length > 0) {
        errorMessage += `Missing required variables: ${missingVars.join(
          ", ",
        )}\n`;
      }

      if (invalidVars.length > 0) {
        errorMessage += "Invalid values:\n";
        invalidVars.forEach(({ key, error }) => {
          errorMessage += `  ${key}: ${error}\n`;
        });
      }

      throw new EnvironmentError(errorMessage, formattedErrors);
    }
    throw new EnvironmentError(
      "Environment validation failed with unknown error",
      undefined,
    );
  }
};

// Validation function for client-side (runtime) with detailed error messages
export const validateClientEnv = (
  envVars: Record<string, string | undefined>,
): ClientEnv => {
  try {
    return clientEnvSchema.parse(envVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.format();
      const missingVars = Object.entries(formattedErrors)
        .filter(
          ([key, value]) =>
            key !== "_errors" &&
            typeof value === "object" &&
            value._errors?.length > 0 &&
            value._errors[0] === "Required",
        )
        .map(([key, _]) => key);

      const invalidVars = Object.entries(formattedErrors)
        .filter(
          ([key, value]) =>
            key !== "_errors" &&
            typeof value === "object" &&
            value._errors?.length > 0 &&
            value._errors[0] !== "Required",
        )
        .map(([key, value]) => ({
          key,
          error: value._errors[0],
        }));

      let errorMessage = "Client environment validation failed:\n";

      if (missingVars.length > 0) {
        errorMessage += `Missing required variables: ${missingVars.join(
          ", ",
        )}\n`;
      }

      if (invalidVars.length > 0) {
        errorMessage += "Invalid values:\n";
        invalidVars.forEach(({ key, error }) => {
          errorMessage += `  ${key}: ${error}\n`;
        });
      }

      throw new EnvironmentError(errorMessage, formattedErrors);
    }
    throw new EnvironmentError(
      "Client environment validation failed with unknown error",
      undefined,
    );
  }
};

// Environment validation for server startup with better error reporting
export const env = (() => {
  try {
    // Validate server environment variables using process.env
    const validatedServerEnv = validateServerEnv(process.env);

    console.log("✅ Environment validation successful");
    return validatedServerEnv;
  } catch (error) {
    if (error instanceof EnvironmentError) {
      console.error("❌ Environment validation failed:", error.message);
      if (error.errors) {
        console.error(
          "Detailed errors:",
          JSON.stringify(error.errors, null, 2),
        );
      }
      throw new Error(`Environment validation failed: ${error.message}`);
    }
    console.error("❌ Unexpected environment validation error:", error);
    throw new Error("Unexpected environment validation error occurred");
  }
})();

// For client-side validation (useful in components)
export const getClientEnvValidation = () => {
  try {
    return validateClientEnv(import.meta.env);
  } catch (error) {
    if (error instanceof EnvironmentError) {
      console.error("❌ Client environment validation failed:", error.message);
      throw new Error(`Client environment validation failed: ${error.message}`);
    }
    throw new Error("Client environment validation failed with unknown error");
  }
};

// Helper function to check if a variable is missing
export const isMissingEnvVar = (varName: string): boolean => {
  return !process.env[varName] || process.env[varName]?.trim() === "";
};

// Helper function to check if a client variable is missing
export const isMissingClientEnvVar = (varName: string): boolean => {
  return !import.meta.env[varName] || import.meta.env[varName]?.trim() === "";
};

// Helper function to get all missing environment variables
export const getMissingEnvVars = (): {
  server: string[];
  client: string[];
} => {
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
  ];

  const requiredClientVars = [
    "VITE_DOMAIN",
    "VITE_AWS_BUCKET_STRING",
    "VITE_GOOGLE_CLIENT_ID",
    "VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE",
    "VITE_GITHUB_CLIENT_ID",
    "VITE_WEBSOCKET",
  ];

  return {
    server: requiredServerVars.filter((varName) => isMissingEnvVar(varName)),
    client: requiredClientVars.filter((varName) =>
      isMissingClientEnvVar(varName),
    ),
  };
};
