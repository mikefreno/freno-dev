/**
 * `/faq` on the Nook subdomain — answers to the objections that actually
 * stop a purchase. Privacy scoping follows marketing/positioning.md rule 3:
 * "no prompt or code content leaves the device" (telemetry and the trial
 * email do leave — never claim "no data leaves the device").
 */
import { For } from "solid-js";
import { createSignal, Show } from "solid-js";
import { PageHead } from "~/components/PageHead";
import { EdgeCacheHeaders } from "~/components/EdgeCacheHeaders";
import SubdomainHeader from "~/components/SubdomainHeader";

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ: FaqEntry[] = [
  {
    question: "Does The Nook read my prompts or my code?",
    answer:
      "No. The hooks and plugins that connect your agents to The Nook send session metadata only — which agent is running, which session, which event happened, which terminal it lives in. No prompt text and no code content leaves your device. Two things do leave the device, and we'd rather say so plainly: anonymous usage telemetry, and your email address if you choose to give it at trial start. That's the whole list."
  },
  {
    question: "Do I need a Mac with a notch?",
    answer:
      "No. On a notched MacBook the island sits in the notch. On machines and displays without one, it anchors to the display your cursor is on, so a desktop setup with external monitors gets the same treatment. Everything inside the island — agent cards, fan control, the stats strip — works identically either way."
  },
  {
    question: "How much battery does it cost?",
    answer:
      "The Nook is a small native UI, not a background agent — it watches the agents you're already running; it doesn't run anything itself. The heaviest thing it does is read and write your Mac's fan and charging controllers, which is a lightweight sensor read. If you're running enough coding agents to need it, those agents dwarf the app's own draw — which is rather the point: the fan control exists because the agents are what heat the machine."
  },
  {
    question: "What permissions does it need?",
    answer:
      "The app itself runs unprivileged. Fan control and charge limiting go through a small helper component that macOS requires to run as root for hardware access — the app installs it on first use and you approve it once with your password. The hooks live in each agent's own config directory; you can inspect or remove every file it writes."
  },
  {
    question: "Why macOS 14 or later?",
    answer:
      "The interface is built on Apple's current observation framework, which ships with macOS 14 (Sonoma). Supporting older versions would mean rewriting the whole UI layer on a deprecated foundation — time that goes into the app instead. macOS 14 runs on hardware from 2018 onward, which covers the machines that run coding agents comfortably."
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. Everything The Nook does — the agent grid, permission cards, fan and thermal control — works with no network at all, and your agents' hooks talk to the app over a local socket. The network is only used for update checks, license activation, and the optional trial email."
  }
];

export default function NookFaqPage() {
  const [open, setOpen] = createSignal<number | null>(0);

  return (
    <>
      <EdgeCacheHeaders maxAge={300} />
      <PageHead
        title="Frequently asked questions"
        description="Does The Nook read your prompts? Do you need a notch? Battery cost, permissions, the macOS 14 requirement, offline use — answered straight."
        ogTitle="The Nook — FAQ"
      />
      <SubdomainHeader />
      <main class="min-h-screen px-[8vw] py-[8vh]">
        <h1 class="text-text mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Questions people actually ask
        </h1>
        <p class="text-subtext0 mb-10 max-w-2xl text-lg">
          The things that decide a purchase, answered without hedging. If
          something here doesn't match your experience, that's a bug —{" "}
          <a
            class="underline underline-offset-2 hover:opacity-80"
            href="mailto:support@freno.me"
          >
            tell us
          </a>
          .
        </p>

        <div class="max-w-3xl space-y-3">
          <For each={FAQ}>
            {(entry, i) => (
              <div class="border-overlay0 bg-surface0/40 rounded-2xl border">
                <button
                  type="button"
                  class="text-text flex w-full items-center justify-between gap-4 p-5 text-left text-base font-semibold"
                  aria-expanded={open() === i()}
                  onClick={() => setOpen(open() === i() ? null : i())}
                >
                  {entry.question}
                  <span class="text-subtext1 shrink-0 font-mono text-sm">
                    {open() === i() ? "−" : "+"}
                  </span>
                </button>
                <Show when={open() === i()}>
                  <p class="text-subtext0 px-5 pb-5 text-sm leading-relaxed">
                    {entry.answer}
                  </p>
                </Show>
              </div>
            )}
          </For>
        </div>
      </main>
    </>
  );
}
