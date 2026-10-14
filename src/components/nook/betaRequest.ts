/**
 * The iPhone beta-access request the landing page posts to
 * `/api/the-nook/report` — the same title the app's Settings ▸ Phone card
 * sends, so requests from both land together. Email only, no device facts.
 */
export function betaRequestPayload(email: string) {
  return {
    title: "iPhone app beta access request",
    description: "Beta access requested from nook.freno.me.",
    contact: email
  };
}
