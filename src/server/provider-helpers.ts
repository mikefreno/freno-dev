import { ConnectionFactory } from "./database";
import { v4 as uuidV4 } from "uuid";
import type { UserProvider } from "~/db/types";
import { logAuditEvent } from "./audit";
import { generateProviderLinkedEmail } from "./email-templates";
import { formatDeviceDescription } from "./device-utils";

/**
 * Link a new authentication provider to an existing user account
 * @param userId - User ID to link provider to
 * @param provider - Provider type
 * @param providerData - Provider-specific data
 * @param options - Optional parameters (deviceInfo, sendEmail)
 * @returns Created UserProvider record
 */
export async function linkProvider(
  userId: string,
  provider: "email" | "google" | "github",
  providerData: {
    providerUserId?: string;
    email?: string;
    displayName?: string;
    image?: string;
  },
  options?: {
    deviceInfo?: {
      deviceName?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
    };
    sendEmail?: boolean;
  }
): Promise<UserProvider> {
  const conn = ConnectionFactory();

  // Check if provider already linked to this user
  const existing = await conn.execute({
    sql: "SELECT * FROM UserProvider WHERE user_id = ? AND provider = ?",
    args: [userId, provider]
  });

  if (existing.rows.length > 0) {
    throw new Error(`Provider ${provider} already linked to this account`);
  }

  // Check if provider identity is already used by another user
  if (providerData.providerUserId) {
    const conflictCheck = await conn.execute({
      sql: "SELECT user_id FROM UserProvider WHERE provider = ? AND provider_user_id = ?",
      args: [provider, providerData.providerUserId]
    });

    if (conflictCheck.rows.length > 0) {
      const conflictUserId = (conflictCheck.rows[0] as any).user_id;
      if (conflictUserId !== userId) {
        throw new Error(
          `This ${provider} account is already linked to a different user`
        );
      }
    }
  }

  // Create new provider link
  const id = uuidV4();
  await conn.execute({
    sql: `INSERT INTO UserProvider (id, user_id, provider, provider_user_id, email, display_name, image)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      provider,
      providerData.providerUserId || null,
      providerData.email || null,
      providerData.displayName || null,
      providerData.image || null
    ]
  });

  // Fetch created record
  const result = await conn.execute({
    sql: "SELECT * FROM UserProvider WHERE id = ?",
    args: [id]
  });

  const userProvider = result.rows[0] as unknown as UserProvider;

  // Log audit event
  await logAuditEvent({
    userId,
    eventType: "auth.provider.linked",
    eventData: {
      provider,
      providerEmail: providerData.email
    },
    success: true
  });

  // Send notification email if requested and user has email
  if (options?.sendEmail !== false) {
    try {
      // Get user email
      const userResult = await conn.execute({
        sql: "SELECT email FROM User WHERE id = ?",
        args: [userId]
      });

      const userEmail = userResult.rows[0]
        ? ((userResult.rows[0] as any).email as string)
        : null;

      if (userEmail) {
        const deviceDescription = options?.deviceInfo
          ? formatDeviceDescription(options.deviceInfo)
          : "Unknown Device";

        const htmlContent = generateProviderLinkedEmail({
          providerName: provider.charAt(0).toUpperCase() + provider.slice(1),
          providerEmail: providerData.email,
          linkTime: new Date().toLocaleString(),
          deviceInfo: deviceDescription
        });

        // Import sendEmail dynamically to avoid circular dependency
        const { default: sendEmail } = await import("./email");
        await sendEmail(
          userEmail,
          "New Authentication Provider Linked",
          htmlContent
        );
      }
    } catch (emailError) {
      // Don't fail the operation if email fails
      console.error("Failed to send provider linked email:", emailError);
    }
  }

  return userProvider;
}

/**
 * Unlink an authentication provider from a user account
 * @param userId - User ID
 * @param provider - Provider to unlink
 * @throws Error if trying to remove last provider
 */
export async function unlinkProvider(
  userId: string,
  provider: "email" | "google" | "github"
): Promise<void> {
  const conn = ConnectionFactory();

  // Check how many providers this user has
  const providersResult = await conn.execute({
    sql: "SELECT COUNT(*) as count FROM UserProvider WHERE user_id = ?",
    args: [userId]
  });

  const providerCount = (providersResult.rows[0] as any).count;

  if (providerCount <= 1) {
    throw new Error(
      "Cannot remove last authentication method. Add another provider first."
    );
  }

  // Delete provider
  const result = await conn.execute({
    sql: "DELETE FROM UserProvider WHERE user_id = ? AND provider = ?",
    args: [userId, provider]
  });

  if ((result as any).rowsAffected === 0) {
    throw new Error(`Provider ${provider} not found for this user`);
  }

  // Log audit event
  await logAuditEvent({
    userId,
    eventType: "auth.provider.unlinked",
    eventData: {
      provider
    },
    success: true
  });
}

/**
 * Get all authentication providers for a user
 * @param userId - User ID
 * @returns Array of UserProvider records
 */
export async function getUserProviders(
  userId: string
): Promise<UserProvider[]> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: "SELECT * FROM UserProvider WHERE user_id = ? ORDER BY created_at ASC",
    args: [userId]
  });

  return result.rows as unknown as UserProvider[];
}

/**
 * Find user by provider and provider-specific identifier
 * @param provider - Provider type
 * @param providerUserId - Provider-specific user ID
 * @returns User ID if found, null otherwise
 */
export async function findUserByProvider(
  provider: "email" | "google" | "github",
  providerUserId: string
): Promise<string | null> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: "SELECT user_id FROM UserProvider WHERE provider = ? AND provider_user_id = ?",
    args: [provider, providerUserId]
  });

  if (result.rows.length === 0) {
    return null;
  }

  return (result.rows[0] as any).user_id;
}

/**
 * Find user by provider and email
 * Used for account linking when email matches
 * @param provider - Provider type
 * @param email - Email address
 * @returns User ID if found, null otherwise
 */
export async function findUserByProviderEmail(
  provider: "email" | "google" | "github",
  email: string
): Promise<string | null> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: "SELECT user_id FROM UserProvider WHERE provider = ? AND email = ?",
    args: [provider, email]
  });

  if (result.rows.length === 0) {
    return null;
  }

  return (result.rows[0] as any).user_id;
}

/**
 * Find any user by email across all providers
 * Used for cross-provider account linking
 * @param email - Email address
 * @returns User ID if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<string | null> {
  const conn = ConnectionFactory();

  // First check User table
  const userResult = await conn.execute({
    sql: "SELECT id FROM User WHERE email = ?",
    args: [email]
  });

  if (userResult.rows.length > 0) {
    return (userResult.rows[0] as any).id;
  }

  // Then check UserProvider table
  const providerResult = await conn.execute({
    sql: "SELECT user_id FROM UserProvider WHERE email = ? LIMIT 1",
    args: [email]
  });

  if (providerResult.rows.length > 0) {
    return (providerResult.rows[0] as any).user_id;
  }

  return null;
}

/**
 * Update last_used_at timestamp for a provider
 * Call this on successful login with that provider
 * @param userId - User ID
 * @param provider - Provider that was used
 */
export async function updateProviderLastUsed(
  userId: string,
  provider: "email" | "google" | "github"
): Promise<void> {
  const conn = ConnectionFactory();

  await conn.execute({
    sql: "UPDATE UserProvider SET last_used_at = datetime('now') WHERE user_id = ? AND provider = ?",
    args: [userId, provider]
  });
}

/**
 * Check if a user has a specific provider linked
 * @param userId - User ID
 * @param provider - Provider to check
 * @returns true if linked, false otherwise
 */
export async function hasProvider(
  userId: string,
  provider: "email" | "google" | "github"
): Promise<boolean> {
  const conn = ConnectionFactory();

  const result = await conn.execute({
    sql: "SELECT id FROM UserProvider WHERE user_id = ? AND provider = ?",
    args: [userId, provider]
  });

  return result.rows.length > 0;
}

/**
 * Get provider summary for a user (for display purposes)
 * @param userId - User ID
 * @returns Summary of linked providers
 */
export async function getProviderSummary(userId: string): Promise<{
  providers: Array<{
    provider: string;
    email?: string;
    displayName?: string;
    lastUsed: string;
  }>;
  count: number;
}> {
  const providers = await getUserProviders(userId);

  return {
    providers: providers.map((p) => ({
      provider: p.provider,
      email: p.email || undefined,
      displayName: p.display_name || undefined,
      lastUsed: p.last_used_at
    })),
    count: providers.length
  };
}
