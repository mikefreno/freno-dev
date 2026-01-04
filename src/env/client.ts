import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_DOMAIN: z.string().min(1),
  VITE_AWS_BUCKET_STRING: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1),
  VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE: z.string().min(1),
  VITE_GITHUB_CLIENT_ID: z.string().min(1),
  VITE_WEBSOCKET: z.string().min(1),
  VITE_INFILL_ENDPOINT: z.string().min(1)
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export const validateClientEnv = (
  envVars: Record<string, string | undefined>
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

      let errorMessage = "Client environment validation failed:\n";

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
    console.error(
      "Client environment validation failed with unknown error:",
      error
    );
    throw new Error("Client environment validation failed with unknown error");
  }
};

const validateAndExportEnv = (): ClientEnv => {
  try {
    const validated = validateClientEnv(import.meta.env);
    console.log("✅ Client environment validation successful");
    return validated;
  } catch (error) {
    console.error("❌ Client environment validation failed:", error);
    throw error;
  }
};

export const env = validateAndExportEnv();

export const isMissingEnvVar = (varName: string): boolean => {
  return !import.meta.env[varName] || import.meta.env[varName]?.trim() === "";
};

export const getMissingEnvVars = (): string[] => {
  const requiredClientVars = [
    "VITE_DOMAIN",
    "VITE_AWS_BUCKET_STRING",
    "VITE_GOOGLE_CLIENT_ID",
    "VITE_GOOGLE_CLIENT_ID_MAGIC_DELVE",
    "VITE_GITHUB_CLIENT_ID",
    "VITE_WEBSOCKET"
  ];

  return requiredClientVars.filter((varName) => isMissingEnvVar(varName));
};
