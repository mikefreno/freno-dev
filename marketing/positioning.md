# The Nook — Positioning (source of truth)

Every drafted asset draws its voice, claims, and constraints from this file. If an
artifact invents its own framing, fix the artifact or fix this file — never both
silently diverging.

Primary source: `~/Code/the-nook/docs/marketing-strategy.md`.

## The sentence

> **Your Mac and your agents, under control.** The Nook puts your whole coding-agent
> fleet in the notch — twelve agents, local or over SSH — so you see what is running,
> unblock it in one tap, and keep the machine from overheating while it works.

## The wedge

The thing to say over and over, in every channel, in slightly different words:

> **An agent blocked on a permission prompt is the most expensive kind of idle.**
> You pay for the model, you pay for the wait, and you get neither.

It is acute, quantifiable, and true — and it is the demo: a card appears, you tap
Allow, work resumes. Ten seconds, no explanation needed.

## The bundling reframe

Three audiences (agent herders, hardware tinkerers, glanceable-widget users) in one
$10 app reads like a grab bag. Reframe as consolidation, which is the honest story:

> One $10 app instead of a notch toy, a fan utility, a battery limiter, a menu-bar
> stats strip, and a notification hack. Same one-time purchase, no subscription.

Price rises to $15 at 1.0 — dated and honest, not a permanent beta.

## Hard rules

### 1. Category nouns, never product nouns

`freno-dev/AGENTS.md` forbids naming any competitor in user-facing copy — landing
pages, marketing copy, comparison tables, meta descriptions, emails, FAQs, all of it.

- Use **category nouns**: "notch app", "menu-bar monitor", "fan control utility",
  "battery charge limiter", "agent notification hack". These carry the same search
  intent and are fully compliant.
- Compare against **the status quo, not a competitor**: "vs. a terminal bell you
  don't hear", "vs. four utilities in your menu bar", "vs. finding out an hour later."
- The rule does not reach App Store–external review replies, direct email, and
  community replies written by a human, where quoting what a user said about another
  tool is normal conversation.

### 2. A claim requires a test to exist

Copy that says "12 agents" or "no data leaves the device" must have a test backing it.
If a claim cannot be pointed at code or a test, it does not go in copy.

### 3. Honest privacy scoping

Telemetry and the trial email **do** leave the device. The defensible claim is:

> **No prompt or code content leaves the device.**

Never "no data leaves the device".

### 4. Sell what works today

Phone approvals are deferred until a shipped iOS app exists — no "(coming soon)"
parentheticals. The launch story is remote SSH: agents running on other machines,
visible and unblockable from the Mac's notch.

### 5. Humans hold every account

No agent authenticates, posts, upvotes, or DMs. No sock puppets, no self-mention
without disclosure. `approved/` **is the only thing a human ever publishes from** —
nothing posts itself.

## Approved claims (each backed by code)

| Claim | Backing |
|---|---|
| Twelve hooked agents, one glance | `AgentSpec.all` — claude, codex, opencode, pi, omp, hermes, openclaw, zai, gemini, cline, qwen, deepseek |
| Remote agents over SSH | `hook/setup.go` remote install path; `NOOK_HOST` TCP transport |
| Permission gate answered from a card | awaitPolicyTable + bridge directive path (`hook/normalize.go`, `serialize.go`) |
| Fan / thermal / charge control | `helper/` (privileged helper, SMC, no kext) |
| One-time purchase, no subscription | $10 → $15 at 1.0; Stripe checkout |
| macOS 14+ | 27 source files use the `@Observable` framework |
| No prompt or code content leaves the device | envelope carries session/event/terminal metadata only (see `docs/agent-interface.md`) |

## Voice

- Short, concrete, no hype adjectives. Numbers over adjectives ("twelve agents",
  "one tap", "$10 once").
- The notch/island is the product's home; agents are the product's point.
- Never apologize for being a utility. The utility is the point.
- Banned phrasings: competitor names (see rule 1), "AI-powered", "revolutionary",
  "game-changer", "seamlessly". Unverifiable superlatives generally.
