import { SignJWT } from "jose";
import { env } from "~/env/server";
import { AUTH_CONFIG, NETWORK_CONFIG } from "~/config";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry
} from "~/server/fetch-utils";

export const LINEAGE_JWT_EXPIRY = AUTH_CONFIG.LINEAGE_JWT_EXPIRY;

/**
 * Generic email sending function
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlContent - HTML content of the email
 * @returns Success status
 */
export default async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; messageId?: string; message?: string }> {
  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

  const emailPayload = {
    sender: {
      name: "freno.me",
      email: "no_reply@freno.me"
    },
    to: [{ email: to }],
    htmlContent,
    subject
  };

  try {
    const response = await fetchWithRetry(
      async () => {
        const res = await fetchWithTimeout(apiUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify(emailPayload),
          timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
        });

        await checkResponse(res);
        return res;
      },
      {
        maxRetries: NETWORK_CONFIG.MAX_RETRIES,
        retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
      }
    );

    const json = (await response.json()) as { messageId?: string };
    if (json.messageId) {
      return { success: true, messageId: json.messageId };
    }
    return { success: false, message: "No messageId in response" };
  } catch (error) {
    console.error("Email sending error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Email service error"
    };
  }
}

export async function sendEmailVerification(userEmail: string): Promise<{
  success: boolean;
  messageId?: string;
  message?: string;
}> {
  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.brevo.com/v3/smtp/email";

  const secret = new TextEncoder().encode(env.JWT_SECRET_KEY);
  const token = await new SignJWT({ email: userEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret);

  const domain = env.VITE_DOMAIN || "https://freno.me";

  const emailPayload = {
    sender: {
      name: "MikeFreno",
      email: "lifeandlineage_no_reply@freno.me"
    },
    to: [
      {
        email: userEmail
      }
    ],
    htmlContent: `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to verify email</p>
    </div>
    <br/>
    <div class="center">
        <a href="${domain}/api/lineage/email/verification/${userEmail}/?token=${token}" class="button">Verify Email</a>
    </div>
</body>
</html>
`,
    subject: `Life and Lineage email verification`
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });

    if (!res.ok) {
      return { success: false, message: "Failed to send email" };
    }

    const json = (await res.json()) as { messageId?: string };
    if (json.messageId) {
      return { success: true, messageId: json.messageId };
    }
    return { success: false, message: "No messageId in response" };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, message: "Email service error" };
  }
}
