import { createSignal, onMount, createEffect, Show, type JSX } from "solid-js";
import { useSearchParams, query, createAsync } from "@solidjs/router";
import { action, redirect } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { api } from "~/lib/api";
import { getClientCookie } from "~/lib/cookies.client";
import CountdownCircleTimer from "~/components/CountdownCircleTimer";
import Input from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useCountdown } from "~/lib/useCountdown";
import { useSite } from "~/context/SiteContext";
import type { UserProfile } from "~/types/user";
import { getCookie, setCookie } from "vinxi/http";
import { z } from "zod";
import { env as clientEnv } from "~/env/client";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError,
  verifyTurnstileToken
} from "~/server/fetch-utils";
import {
  NETWORK_CONFIG,
  COOLDOWN_TIMERS,
  VALIDATION_CONFIG,
  COUNTDOWN_CONFIG,
  TURNSTILE_CONFIG
} from "~/config";
import {
  CONTACT_RECIPIENT_EMAIL,
  CONTACT_SENDER,
  getContactContext,
  buildContactSubject
} from "~/lib/contact-config";

/**
 * Shared, site-aware contact form — per-subdomain contact pages.
 *
 * Extracted verbatim-in-spirit from the legacy `src/routes/contact.tsx` so the
 * main-site contact flow (`freno.me/contact`) keeps its exact Turnstile +
 * cooldown + tRPC-submission behavior — the only substantive change is that
 * the outbound email subject is now per-site (see `~/lib/contact-config.ts`)
 * and `env` is resolved via a server-only dynamic import (the legacy
 * top-level `env` reference was a latent runtime bug in the no-JS fallback).
 *
 * Site awareness:
 *  - Reads `useSite()` and resolves a default `ContactContext` from
 *    `CONTACT_CONTEXT[site().id]` (subjectPrefix, recipientLabel, heading,
 *    PageHead title + description). Props override the defaults.
 *  - Emits `<PageHead>` so every per-subdomain `/contact` route gets
 *    site-aware title / canonical / OG tags for free.
 *  - The Turnstile site key (`VITE_TURNSTILE_SITE_KEY`) is shared across all
 *    subdomains — ensure it is configured for `*.freno.me` in the Cloudflare
 *    Turnstile dashboard.
 *
 * Email routing:
 *  - JS path: `api.misc.sendContactRequest.mutate({ …, subjectPrefix })` — the
 *    tRPC mutation builds the subject via `buildContactSubject`.
 *  - No-JS path: the `sendContactEmail` server action reads a hidden
 *    `subjectPrefix` form field and emits the identical subject. Both paths
 *    deliver to the single shared `CONTACT_RECIPIENT_EMAIL` inbox.
 *
 * Both redirect targets (`/contact?success=true`, `/contact?error=…`) are the
 * PUBLIC browser path — correct on every subdomain origin since vercel.json
 * host rewrites leave the browser URL clean (`nessa.freno.me/contact`).
 */
export interface ContactFormProps {
  /**
   * Outbound email subject prefix token. Defaults to the active site's
   * `CONTACT_CONTEXT[siteId].subjectPrefix` (e.g. `"freno.me"` on main,
   * `"[Nessa]"` on nessa).
   */
  subjectPrefix?: string;
  /** Display-only label for the recipient. Defaults to the site context. */
  recipientLabel?: string;
  /** `<h1>` heading. Defaults to the site context's `heading` (`"Contact"`). */
  heading?: string;
  /** Optional subline rendered under the heading (e.g. main-site disclaimer). */
  subline?: JSX.Element;
  /**
   * Extra content rendered between the heading/subline and the form — used by
   * the main site and the lineage subdomain to host the Life-and-Lineage Q&A
   * accordion.
   */
  children?: JSX.Element;
  /** `<PageHead title>` — composes with the site `titleSuffix`. */
  pageTitle?: string;
  /** `<PageHead description>`. Defaults to the site context's description. */
  pageDescription?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Server data query — cooldown cookie expiry (shared across all sites).
// ───────────────────────────────────────────────────────────────────────────
const getContactData = query(async () => {
  "use server";
  const contactExp = getCookie("contactRequestSent");
  let remainingTime = 0;

  if (contactExp) {
    const expires = new Date(contactExp);
    remainingTime = Math.max(0, (expires.getTime() - Date.now()) / 1000);
  }

  return { remainingTime };
}, "contact-data");

// ───────────────────────────────────────────────────────────────────────────
// No-JS fallback action. Behaves identically to the tRPC mutation so the
// contact form works even with JS disabled (progressive enhancement).
//
// `env` is resolved via a server-only dynamic import (the idiomatic pattern
// used by `account.tsx` / `blog/index.tsx`) — the legacy top-level `env`
// reference in the original `contact.tsx` was a latent runtime bug.
// ───────────────────────────────────────────────────────────────────────────
const sendContactEmail = action(async (formData: FormData) => {
  "use server";
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;
  const turnstileToken = formData.get("cf-turnstile-response") as string;
  const subjectPrefix =
    (formData.get("subjectPrefix") as string | null) || "freno.me";

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    message: z
      .string()
      .min(1, "Message is required")
      .max(VALIDATION_CONFIG.MAX_CONTACT_MESSAGE_LENGTH, "Message too long")
  });

  try {
    schema.parse({ name, email, message });
  } catch (err: any) {
    return redirect(
      `/contact?error=${encodeURIComponent(err.errors[0]?.message || "Invalid input")}`
    );
  }

  const { env } = await import("~/env/server");

  const turnstileValid = await verifyTurnstileToken(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    TURNSTILE_CONFIG.VERIFY_URL,
    TURNSTILE_CONFIG.RESPONSE_TIMEOUT_MS
  );

  if (!turnstileValid) {
    return redirect(
      "/contact?error=Security verification failed. Please refresh and try again."
    );
  }

  const contactExp = getCookie("contactRequestSent");
  if (contactExp) {
    const expires = new Date(contactExp);
    const remaining = expires.getTime() - Date.now();
    if (remaining > 0) {
      return redirect(
        "/contact?error=Please wait before sending another message"
      );
    }
  }

  const apiKey = env.SENDINBLUE_KEY;
  const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const sendinblueData = {
    sender: { ...CONTACT_SENDER },
    to: [{ email: CONTACT_RECIPIENT_EMAIL }],
    htmlContent: `<html><head></head><body><div>Source: ${escapeHtml(subjectPrefix)}</div><div>Request Name: ${escapeHtml(name)}</div><div>Request Email: ${escapeHtml(email)}</div><div>Request Message: ${escapeHtml(message)}</div></body></html>`,
    subject: buildContactSubject(subjectPrefix)
  };

  try {
    await fetchWithRetry(
      async () => {
        const response = await fetchWithTimeout(apiUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify(sendinblueData),
          timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
        });

        await checkResponse(response);
        return response;
      },
      {
        maxRetries: NETWORK_CONFIG.MAX_RETRIES,
        retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
      }
    );

    const exp = new Date(Date.now() + COOLDOWN_TIMERS.CONTACT_REQUEST_MS);
    setCookie("contactRequestSent", exp.toUTCString(), {
      expires: exp,
      path: "/"
    });

    return redirect("/contact?success=true");
  } catch (error) {
    let errorMessage =
      "Failed to send message. You can reach me at michael@freno.me";

    if (error instanceof TimeoutError) {
      errorMessage =
        "Email service timed out. Please try again or contact michael@freno.me";
    } else if (error instanceof NetworkError) {
      errorMessage =
        "Network error. Please try again or contact michael@freno.me";
    } else if (error instanceof APIError) {
      errorMessage =
        "Email service error. You can reach me at michael@freno.me";
    }

    return redirect(`/contact?error=${encodeURIComponent(errorMessage)}`);
  }
});

export function ContactForm(props: ContactFormProps) {
  const site = useSite();
  const ctx = () => getContactContext(site().id);

  // Effective values — props override the site-context defaults.
  const effectiveSubjectPrefix = () =>
    props.subjectPrefix ?? ctx().subjectPrefix;
  const effectiveRecipientLabel = () =>
    props.recipientLabel ?? ctx().recipientLabel;
  const effectiveHeading = () => props.heading ?? ctx().heading;
  const effectivePageTitle = () => props.pageTitle ?? ctx().pageTitle;
  const effectivePageDescription = () =>
    props.pageDescription ?? ctx().description;

  const [searchParams] = useSearchParams();

  const contactData = createAsync(() => getContactData(), {
    deferStream: true
  });

  const [emailSent, setEmailSent] = createSignal<boolean>(
    searchParams.success === "true"
  );
  const [error, setError] = createSignal<string>(
    searchParams.error ? decodeURIComponent(String(searchParams.error)) : ""
  );
  const [loading, setLoading] = createSignal<boolean>(false);
  const [user, setUser] = createSignal<UserProfile | null>(null);
  const [jsEnabled, setJsEnabled] = createSignal<boolean>(false);
  const [turnstileToken, setTurnstileToken] = createSignal<string>("");
  const [turnstileWidgetId, setTurnstileWidgetId] = createSignal<string | null>(
    null
  );

  const { remainingTime, startCountdown, setRemainingTime } = useCountdown();

  onMount(() => {
    setJsEnabled(true);

    // Load Cloudflare Turnstile script with explicit rendering.
    // The site key is shared across all subdomains — ensure it is configured
    // for `*.freno.me` in the Cloudflare Turnstile dashboard.
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).turnstile) {
        const container = document.getElementById("turnstile-widget-1");
        if (container) {
          const id = (window as any).turnstile.render(container, {
            sitekey: clientEnv.VITE_TURNSTILE_SITE_KEY,
            theme: "dark",
            callback: (token: string) => {
              setTurnstileToken(token);
            },
            "expired-callback": () => {
              setTurnstileToken("");
            }
          });
          setTurnstileWidgetId(id);
        }
      }
    };
    document.head.appendChild(script);

    // Best-effort profile prefill. On subdomain sites there is no freno.me web
    // auth (Nessa uses Clerk, Lineage uses its mobile JWT) so this resolves to
    // null / 401 — the `.catch` swallows it and the fields stay blank.
    api.user.getProfile
      .query()
      .then((userData) => {
        if (userData) {
          setUser(userData);
        }
      })
      .catch(() => {});
  });

  createEffect(() => {
    // Try server data first (more accurate)
    const serverData = contactData();
    if (serverData?.remainingTime && serverData.remainingTime > 0) {
      const expirationTime = new Date(
        Date.now() + serverData.remainingTime * 1000
      );
      startCountdown(expirationTime);
      return;
    }

    // Fall back to client cookie if server data not available yet
    const timer = getClientCookie("contactRequestSent");
    if (timer) {
      try {
        startCountdown(timer);
      } catch (e) {
        console.error("Failed to start countdown from cookie:", e);
      }
    }
  });

  const sendEmailTrigger = async (e: Event) => {
    if (!jsEnabled()) return;

    e.preventDefault();
    const form = e.target as unknown as HTMLFormElement;
    const formData = new FormData(form);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (name && email && message) {
      let currentToken = turnstileToken();
      if (
        !currentToken &&
        typeof window !== "undefined" &&
        (window as any).turnstile
      ) {
        const widgetEl = document.getElementById("turnstile-widget-1");
        if (widgetEl) {
          const id = turnstileWidgetId();
          currentToken = (window as any).turnstile.getResponse(id || widgetEl);
        }
      }

      if (!currentToken || currentToken.trim() === "") {
        setError("Please complete the security check.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setEmailSent(false);

      try {
        const res = await api.misc.sendContactRequest.mutate({
          name,
          email,
          message,
          turnstileToken: currentToken,
          subjectPrefix: effectiveSubjectPrefix()
        });

        if (res.message === "email sent") {
          setEmailSent(true);
          setError("");
          form.reset();

          if (typeof window !== "undefined" && (window as any).turnstile) {
            const widgetEl = document.getElementById("turnstile-widget-1");
            if (widgetEl) {
              const id = turnstileWidgetId();
              (window as any).turnstile.reset(id || widgetEl);
            }
          }
          setTurnstileToken("");

          // Set countdown directly — cookie might not be readable immediately
          const expirationTime = new Date(
            Date.now() + COOLDOWN_TIMERS.CONTACT_REQUEST_MS
          );
          startCountdown(expirationTime);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setEmailSent(false);
      }
      setLoading(false);
    }
  };

  const renderTime = ({ remainingTime }: { remainingTime: number }) => {
    const time = isNaN(remainingTime) ? 0 : Math.max(0, remainingTime);
    return (
      <div class="timer">
        <div class="value">{time.toFixed(0)}</div>
      </div>
    );
  };

  return (
    <>
      <PageHead
        title={effectivePageTitle()}
        description={effectivePageDescription()}
      />

      <div class="bg-base flex min-h-screen w-full justify-center">
        <div class="w-full max-w-4xl px-4 pt-[20vh]">
          <div class="text-center text-3xl tracking-widest">
            {effectiveHeading()}
          </div>
          <Show when={props.subline}>
            <div class="mt-4 -mb-4 text-center text-xl tracking-widest">
              {props.subline}
            </div>
          </Show>
          {props.children}
          <form
            onSubmit={sendEmailTrigger}
            method="post"
            action={sendContactEmail}
            class="w-full"
          >
            {/* Hidden per-site subject prefix — consumed by the no-JS action. */}
            <input
              type="hidden"
              name="subjectPrefix"
              value={effectiveSubjectPrefix()}
            />
            <div class="flex w-full flex-col justify-evenly">
              <div class="mx-auto w-full justify-evenly md:flex md:flex-row">
                <Input
                  type="text"
                  required
                  name="name"
                  value={user()?.displayName ?? ""}
                  title="Please enter your name"
                  label="Name"
                  containerClass="input-group md:mx-4"
                  class="w-full"
                />
                <Input
                  type="email"
                  required
                  name="email"
                  value={user()?.email ?? ""}
                  title="Please enter a valid email address"
                  label="Email"
                  containerClass="input-group md:mx-4"
                  class="w-full"
                />
              </div>
              <div class="mx-auto w-full pt-6 md:pt-12">
                <div class="textarea-group">
                  <textarea
                    required
                    name="message"
                    placeholder=" "
                    title="Please enter your message"
                    class="underlinedInput w-full bg-transparent"
                    rows={4}
                    maxlength={VALIDATION_CONFIG.MAX_CONTACT_MESSAGE_LENGTH}
                  />
                  <span class="bar" />
                  <label class="underlinedInputLabel">Message</label>
                </div>
              </div>
              <div class="mx-auto flex w-full justify-between pt-4">
                <div id="turnstile-widget-1"></div>
                <Show
                  when={
                    remainingTime() > 0 ||
                    (contactData()?.remainingTime ?? 0) > 0
                  }
                  fallback={
                    <Button type="submit" loading={loading()} class="w-36">
                      Send Message
                    </Button>
                  }
                >
                  <Show
                    when={jsEnabled()}
                    fallback={
                      <div class="flex items-center justify-center text-sm text-zinc-400">
                        Please wait{" "}
                        {Math.ceil(contactData()?.remainingTime ?? 0)}s before
                        sending another message
                      </div>
                    }
                  >
                    <CountdownCircleTimer
                      duration={COUNTDOWN_CONFIG.CONTACT_FORM_DURATION_S}
                      initialRemainingTime={remainingTime()}
                      size={48}
                      strokeWidth={6}
                      onComplete={() => setRemainingTime(0)}
                    >
                      {renderTime}
                    </CountdownCircleTimer>
                  </Show>
                </Show>
              </div>
            </div>
          </form>
          <div
            class={`${
              emailSent()
                ? "text-green-400"
                : error() !== ""
                  ? "text-red-400"
                  : "user-select opacity-0"
            } flex justify-center text-center italic transition-opacity duration-300 ease-in-out`}
          >
            {emailSent()
              ? `Email sent to ${effectiveRecipientLabel()}!`
              : error()}
          </div>
        </div>
      </div>
    </>
  );
}

export default ContactForm;
