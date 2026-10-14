import { For, Show, createSignal } from "solid-js";
import Button from "~/components/ui/Button";
import Input from "~/components/ui/Input";
import { STATUS, ACCENT } from "./IslandMock";
import { useDemoLoop } from "./useDemoLoop";
import { betaRequestPayload } from "./betaRequest";

/**
 * iPhone + Apple Watch companion, in TestFlight beta. The request form
 * mirrors Settings ▸ Phone's BetaAccessCard in the app: it sends only the
 * email, over the same `/api/the-nook/report` pipeline (see betaRequest.ts).
 */

type RequestState = "idle" | "sending" | "sent" | "limited" | "failed";

function requestBetaAccess(email: string): Promise<Response> {
  return fetch("/api/the-nook/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(betaRequestPayload(email))
  });
}

/* ── Demo: a request lands on the phone, a question on the wrist ─── */

function CompanionDemo() {
  const [phase, setPhase] = createSignal<
    "quiet" | "ask" | "allowed" | "question" | "answered"
  >("quiet");
  useDemoLoop(11000, [
    [0, () => setPhase("quiet")],
    [900, () => setPhase("ask")],
    [3600, () => setPhase("allowed")],
    [5400, () => setPhase("question")],
    [8200, () => setPhase("answered")]
  ]);

  const askVisible = () => phase() !== "quiet";
  const allowed = () => phase() !== "quiet" && phase() !== "ask";
  const working = () => (allowed() ? 3 : 2);
  const waiting = () => (phase() === "ask" ? 1 : 0);

  return (
    <div class="flex items-end justify-center gap-5">
      {/* iPhone */}
      <div
        class="relative h-[300px] w-[150px] overflow-hidden rounded-[28px] p-2"
        style={{
          background:
            "radial-gradient(120% 80% at 30% 0%, #2b4a6b 0%, #191b2e 60%, #0d0d0f 100%)",
          "box-shadow":
            "inset 0 0 0 1.5px rgba(255,255,255,0.18), 0 20px 50px rgba(0,0,0,0.5)"
        }}
      >
        <div class="mx-auto mt-1 h-[16px] w-[52px] rounded-full bg-black" />
        <p class="mt-3 text-center text-[30px] leading-none font-semibold text-white/90">
          9:41
        </p>
        {/* Lock Screen widget: what the numbers count */}
        <div class="mt-2 flex justify-center gap-1">
          <span
            class="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold whitespace-nowrap text-white/85"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <span class="h-1.5 w-1.5 rounded-[1px]" style={{ background: STATUS.running }} />
            {working()} working
          </span>
          <span
            class="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold whitespace-nowrap text-white/85"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <span
              class="h-1.5 w-1.5 rounded-[1px]"
              style={{ background: waiting() ? STATUS.attention : STATUS.idle }}
            />
            {waiting()} waiting
          </span>
        </div>
        {/* notification */}
        <div
          class="absolute inset-x-2 top-[118px] rounded-2xl p-2 text-left transition-all duration-500"
          style={{
            background: "rgba(40,40,46,0.88)",
            "backdrop-filter": "blur(8px)",
            opacity: askVisible() ? 1 : 0,
            transform: askVisible() ? "translateY(0)" : "translateY(-14px)"
          }}
        >
          <div class="flex items-center gap-1">
            <img src="/nook/icon.png" alt="" class="h-3 w-3 rounded-[3px]" />
            <span class="text-[7.5px] font-semibold tracking-wide text-white/50 uppercase">
              The Nook · now
            </span>
          </div>
          <p class="mt-1 text-[9.5px] font-semibold text-white">
            {allowed() ? "Allowed ✓" : "Claude Code · the-nook"}
          </p>
          <p class="text-[9px] leading-snug text-white/60">
            {allowed() ? "Back to work." : "Run Bash: swift test"}
          </p>
          <Show when={!allowed()}>
            <div class="mt-1.5 flex gap-1">
              <span
                class="flex-1 rounded-md py-0.5 text-center text-[8.5px] font-semibold text-white"
                style={{ background: ACCENT }}
              >
                Allow
              </span>
              <span class="flex-1 rounded-md bg-white/10 py-0.5 text-center text-[8.5px] font-semibold text-white/80">
                Deny
              </span>
            </div>
          </Show>
        </div>
      </div>

      {/* Apple Watch */}
      <div class="flex flex-col items-center">
        <div class="h-3 w-[64px] rounded-t-md bg-white/10" />
        <div
          class="relative h-[118px] w-[98px] overflow-hidden rounded-[26px] bg-black p-2.5"
          style={{
            "box-shadow":
              "inset 0 0 0 2px rgba(255,255,255,0.16), 0 14px 34px rgba(0,0,0,0.5)",
            transform: phase() === "question" ? "rotate(-2deg)" : "rotate(0deg)",
            transition: "transform 0.15s"
          }}
        >
          <Show
            when={phase() === "question" || phase() === "answered"}
            fallback={
              <div class="flex h-full flex-col items-center justify-center">
                <span class="font-mono text-[18px] font-semibold text-white/90">
                  {working()}
                </span>
                <span class="text-[8px] text-white/50">agents working</span>
              </div>
            }
          >
            <p class="text-[8px] font-semibold text-white/50">Codex asks</p>
            <p class="mt-0.5 text-[9.5px] leading-snug font-semibold text-white">
              Ship it to staging?
            </p>
            <div class="mt-2 space-y-1">
              <For each={["Yes", "Not yet"]}>
                {(option, i) => (
                  <span
                    class="block rounded-full py-1 text-center text-[8.5px] font-semibold transition-colors duration-300"
                    style={{
                      background:
                        phase() === "answered" && i() === 0
                          ? STATUS.ready
                          : "rgba(255,255,255,0.12)",
                      color: "white"
                    }}
                  >
                    {phase() === "answered" && i() === 0 ? "Sent ✓" : option}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
        <div class="h-3 w-[64px] rounded-b-md bg-white/10" />
      </div>
    </div>
  );
}

export default function PhoneBeta(props: { brandColor: string }) {
  const [email, setEmail] = createSignal("");
  const [state, setState] = createSignal<RequestState>("idle");

  const submit = async () => {
    const contact = email().trim();
    if (!contact || state() === "sending") return;
    setState("sending");
    try {
      const res = await requestBetaAccess(contact);
      if (res.status === 429) return setState("limited");
      if (!res.ok) return setState("failed");
      setEmail("");
      setState("sent");
    } catch {
      setState("failed");
    }
  };

  return (
    <section class="bg-base relative z-20 px-4 py-20 md:px-8" id="iphone">
      <div class="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div>
          <span class="border-overlay0 bg-surface0 text-subtext0 mb-4 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide">
            TestFlight beta
          </span>
          <h2 class="text-text mb-3 text-3xl font-bold tracking-tight">
            Your fleet, in your pocket
          </h2>
          <p class="text-subtext0 mb-5 leading-relaxed">
            The iPhone and Apple Watch companion is in beta. Approvals,
            questions, and replies reach you away from the desk, and your
            answer goes straight back to the agent.
          </p>
          <ul class="mb-8 space-y-2.5">
            <For
              each={[
                "Allow, deny, answer, and reply from iPhone or Apple Watch",
                "Connects over an end-to-end encrypted relay, your tailnet, or your LAN",
                "Home Screen, Lock Screen, and watch-face widgets for fleet status",
                "Mute notifications for a while, or while you're active at the Mac"
              ]}
            >
              {(bullet) => (
                <li class="text-subtext1 flex gap-2.5 text-sm">
                  <span
                    class="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-[2px]"
                    style={{ background: ACCENT }}
                  />
                  {bullet}
                </li>
              )}
            </For>
          </ul>

          <div class="border-overlay0 bg-surface0 rounded-xl border p-6">
            <h3 class="text-text mb-1 text-lg font-bold">Request beta access</h3>
            <p class="text-subtext0 mb-4 text-sm">
              Leave your email to get a TestFlight invite. We only receive your
              email address.
            </p>
            <form
              class="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Input
                type="email"
                required
                label="Email"
                containerClass="flex-1"
                disabled={state() === "sending"}
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
              <Button
                type="submit"
                variant="primary"
                color={props.brandColor}
                loading={state() === "sending"}
              >
                Request access
              </Button>
            </form>
            <Show when={state() === "sent"}>
              <p class="text-subtext1 mt-4 text-sm">
                Thanks. Watch your inbox for a TestFlight invite.
              </p>
            </Show>
            <Show when={state() === "limited"}>
              <p class="mt-4 text-sm text-red-500">
                Too many requests from this network. Try again later.
              </p>
            </Show>
            <Show when={state() === "failed"}>
              <p class="mt-4 text-sm text-red-500">
                Couldn't send the request. Check your connection and try again.
              </p>
            </Show>
          </div>
        </div>

        <div
          class="rounded-2xl px-6 py-10"
          style={{
            background:
              "radial-gradient(70% 90% at 50% 0%, rgba(72,151,178,0.12) 0%, transparent 70%) #0d0d0f"
          }}
        >
          <CompanionDemo />
        </div>
      </div>
    </section>
  );
}
