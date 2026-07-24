/**
 * Pure content + metadata for the Nessa subdomain landing page.
 *
 * Sourced from the real product positioning doc in
 * `~/code/Nessa/plans/2026-03-16-marketing-strategy-launch-positioning.md`
 * and the profitability plan (`nessa_profitability_plan_2026-03-09.md`).
 *
 * Intentionally imports NOTHING from solid-js / @solidjs /
 * @solidjs/meta so it can be unit-tested with `bun:test` and referenced from
 * the route render layer without dragging the router into pure tests.
 */

export const TAGLINE = "The fitness app that puts you first." as const;
export const SUBTITLE =
  "Tired of Strava's paywalls and price hikes? Track, train, and connect — without the paywall." as const;

export const ICON_DEFAULT =
  "/Nessa Exports/Nessa-iOS-Default-1024x1024.png" as const;
export const ICON_DARK = "/Nessa Exports/Nessa-iOS-Dark-1024x1024.png" as const;

export const SCREENSHOTS = {
  home: {
    src: "/Nessa Exports/01-home-tab.png",
    alt: "Nessa home dashboard with activity metrics"
  },
  segments: {
    src: "/Nessa Exports/40-segment-list.png",
    alt: "Segment leaderboards and KOM/QOM contenders"
  },
  clubs: {
    src: "/Nessa Exports/09-clubs-list.png",
    alt: "Clubs and social feed"
  },
  workoutSummary: {
    src: "/Nessa Exports/38-workout-summary.png",
    alt: "Workout summary and training log"
  },
  plans: {
    src: "/Nessa Exports/04-plans-tab-strength.png",
    alt: "AI-powered training plans and structured workouts"
  },
  appleHealth: {
    src: "/Nessa Exports/29-apple-health.png",
    alt: "Apple Health integration"
  }
} as const;

export interface Feature {
  title: string;
  description: string;
  free: boolean;
}

export const FEATURES: readonly Feature[] = [
  {
    title: "Track every sport",
    description:
      "Activity tracking for running, cycling, swimming, and 8+ sports with full GPS, heart-rate, and duration metrics.",
    free: true
  },
  {
    title: "Segment leaderboards — free forever",
    description:
      "Create segments and compete on leaderboards without paying a subscription. Nessa keeps the features other apps gate behind paywalls free.",
    free: true
  },
  {
    title: "Clubs & community challenges",
    description:
      "Join clubs, run monthly challenges, post to the social feed, and cheer friends on with kudos and comments.",
    free: true
  },
  {
    title: "Native Apple Watch companion",
    description:
      "Start, follow, and finish workouts from your wrist. Built from the ground up for the Apple ecosystem with Apple Health integration.",
    free: true
  },
  {
    title: "Route planning & offline maps",
    description:
      "Plan routes with turn-by-turn navigation and download maps so you stay on track when coverage drops.",
    free: false
  },
  {
    title: "AI training plans",
    description:
      "Get personalized training plans shaped around your goals, schedule, and fitness history.",
    free: false
  }
] as const;

export interface PricingTier {
  key: "free" | "plus" | "pro";
  header: string;
  price: string;
  badge?: string;
  headline: string;
  features: readonly string[];
  cta: string;
}

export const PRICING: readonly PricingTier[] = [
  {
    key: "free",
    header: "Everything You Need",
    price: "$0 — Always Free",
    headline:
      "Most fitness apps charge for the basics. We don't. Track your activities, compete on segments, and connect with friends — completely free.",
    features: [
      "Activity tracking for 8+ sports",
      "Segment creation + leaderboards",
      "Social feed, kudos & comments",
      "Training log & activity history",
      "Customizable heart-rate zones",
      "Clubs & community challenges",
      "Apple Watch companion app",
      "Apple Health integration"
    ],
    cta: "Get Started Free"
  },
  {
    key: "plus",
    header: "Take It Further",
    price: "$4.99/month or $49.99/year",
    badge: "17% savings with annual",
    headline:
      "Plan your routes, go offline, and dive deeper into your performance data. Everything you need to train smarter.",
    features: [
      "Route planning with turn-by-turn navigation",
      "Offline maps for areas without coverage",
      "Advanced segment analytics",
      "Personal heatmaps showing all your adventures"
    ],
    cta: "Start Free Trial"
  },
  {
    key: "pro",
    header: "Train Smarter",
    price: "$9.99/month or $99.99/year",
    badge: "17% savings with annual",
    headline:
      "AI-powered training plans, advanced analytics, and premium challenges. For athletes who mean business.",
    features: [
      "AI-powered personalized training plans",
      "Premium challenges with rewards",
      "Fitness & freshness tracking",
      "Matched activities for route comparison",
      "Priority customer support"
    ],
    cta: "Start Free Trial"
  }
] as const;

export interface ComparisonRow {
  feature: string;
  strava: string;
  nessa: string;
}

export const COMPARISON: readonly ComparisonRow[] = [
  {
    feature: "Segment leaderboards",
    strava: "Paywalled",
    nessa: "Free forever"
  },
  { feature: "Privacy", strava: "Server-side data", nessa: "On-device first" },
  { feature: "Premium price", strava: "$23.99/mo", nessa: "From $4.99/mo" },
  {
    feature: "Apple Watch",
    strava: "Companion app",
    nessa: "Native experience"
  }
] as const;

export const WHY_NESSA = [
  {
    title: "Segment leaderboards free forever",
    body: "Strava's most complained-about paywall is included in Nessa's free tier."
  },
  {
    title: "Half the price of Strava",
    body: "Premium tiers at 50–60% of Strava's cost, with no surprise paywalls."
  },
  {
    title: "Privacy-first",
    body: "Your fitness data stays on your device. No data mining, no targeted ads."
  },
  {
    title: "Built for Apple Watch",
    body: "A native watch experience, not an afterthought. Apple Health included."
  }
] as const;
