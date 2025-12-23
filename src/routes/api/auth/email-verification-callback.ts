import type { APIEvent } from "@solidjs/start/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

export async function GET(event: APIEvent) {
  const url = new URL(event.request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verification Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #e53e3e; margin-bottom: 1rem; }
          p { color: #4a5568; margin-bottom: 1.5rem; }
          a {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            transition: background 0.3s;
          }
          a:hover { background: #5a67d8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Verification Failed</h1>
          <p>Invalid verification link. Please check your email and try again.</p>
          <a href="/login">Return to Login</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  try {
    // Create tRPC caller to invoke the emailVerification procedure
    const ctx = await createTRPCContext(event);
    const caller = appRouter.createCaller(ctx);

    // Call the email verification handler
    const result = await caller.auth.emailVerification({
      email,
      token,
    });

    if (result.success) {
      // Show success page
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verified</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #48bb78; margin-bottom: 1rem; }
            p { color: #4a5568; margin-bottom: 1.5rem; }
            .checkmark {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            a {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: #48bb78;
              color: white;
              text-decoration: none;
              border-radius: 0.5rem;
              transition: background 0.3s;
            }
            a:hover { background: #38a169; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1>Email Verified!</h1>
            <p>${result.message || "Your email has been successfully verified."}</p>
            <a href="/login">Continue to Login</a>
          </div>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    } else {
      throw new Error("Verification failed");
    }
  } catch (error) {
    console.error("Email verification callback error:", error);

    // Check if it's a token expiration error
    const errorMessage = error instanceof Error ? error.message : "server_error";
    const isTokenError = errorMessage.includes("expired") || errorMessage.includes("invalid");

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verification Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #e53e3e; margin-bottom: 1rem; }
          p { color: #4a5568; margin-bottom: 1.5rem; }
          a {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            transition: background 0.3s;
            margin: 0.5rem;
          }
          a:hover { background: #5a67d8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Verification Failed</h1>
          <p>${isTokenError ? "This verification link has expired. Please request a new verification email." : "An error occurred during verification. Please try again."}</p>
          <a href="/login">Return to Login</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
