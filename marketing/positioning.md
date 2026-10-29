# The Nook — Positioning (source of truth)

Every drafted asset draws its voice, claims, and constraints from this file. If an
artifact invents its own framing, fix the artifact or fix this file — never both
silently diverging.

**Reconciled 2026-10-29** against the CTO's verdicts ([FRE-315], [FRE-322],
[FRE-354]), the Chief of Staff's price decision (2026-10-29 04:01), the Plan B
launch route ([FRE-346] → [FRE-203] `plan-b`), and `The-Nook` master (app floor is
**14.2**, not 14.0 — `freno-dev` `881190d`, site merge `134f41e`). The previous
version of this file named an upstream `the-nook/docs/marketing-strategy.md` that
no longer exists; the verdicts below are the source of truth it was pointing at.

[FRE-315]: https://paperclip.freno.me/FRE/issues/FRE-315
[FRE-322]: https://paperclip.freno.me/FRE/issues/FRE-322
[FRE-354]: https://paperclip.freno.me/FRE/issues/FRE-354
[FRE-320]: https://paperclip.freno.me/FRE/issues/FRE-320
[FRE-346]: https://paperclip.freno.me/FRE/issues/FRE-346
[FRE-203]: https://paperclip.freno.me/FRE/issues/FRE-203

## The sentence

There is no single approved public sentence yet, and saying otherwise is the one
mistake this file exists to prevent. What exists is a **launch claim set** — two
sentences, both from one 15-second take, recorded as the chosen route by the Chief
of Staff on 2026-10-29 ([FRE-346] `decision` §2–§4):

| Slot | Exact sentence | Status today |
|---|---|---|
| Launch line | **"Every agent you're running reports into one notch, and the one waiting on you pins above the rest."** | Verified by code ([FRE-322] §3). Needs the one-Mac take before it is publishable. |
| Second line, same take | **"Approve an agent's tool call from your Mac's notch, and the agent carries on."** | Needs the demo ([FRE-322] §1). The same take settles it. |

Working line for internal writing, not for publication:

> **Your Mac and your agents, under control.** One notch for the whole fleet: you
> see what is running, you unblock what is waiting, and the machine stays cool
> while it works.

## The wedge

The thing to say over and over, in every channel, in slightly different words:

> **An agent blocked on a permission prompt is the most expensive kind of idle.**
> You pay for the model, you pay for the wait, and you get neither.

It is acute, quantifiable, and true — and it is the demo: a card appears, you tap
Allow, work resumes. Ten seconds, no explanation needed.

## The consolidation reframe

Three audiences (agent herders, hardware tinkerers, glanceable-widget users) in one
app reads like a grab bag. Reframe as consolidation, which is the honest story:

> One app instead of a notch toy, a fan utility, a battery limiter, a menu-bar stats
> strip, and a notification hack. One purchase, no subscription.

**No price, no discount and no future price in copy.** The price is $10, it stays
$10, and the dated rise to $15 is withdrawn (Chief of Staff, 2026-10-29 04:01). A
price change is a Chief of Staff + sponsor call; it is never a marketing decision
and never a launch asset.

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

### 2. A claim needs a verdict, not just a test

Copy that says "every agent", "13 agents", "no data leaves the device" must point at
both a test **and** a CTO verdict naming the exact sentence. A passing test is not a
verdict; a verdict is not a recording. If a sentence cannot be traced to a row in the
tables below, it does not go in copy.

### 3. Honest privacy scoping

Telemetry and the licence check **do** leave the device: Sentry runs on **every
launch, unconditionally** (with the Mac's IP address via `sendDefaultPii`), and the
trial check sends `IOPlatformUUID` and the device name to `freno.me` ([FRE-322]
§2.4, corrected by [FRE-354] `(b)`). Never publish, in any wording:

- "no data leaves the device" / "local-only" / "no telemetry" / "no account"
- "nothing leaves your Mac"

The one favourable engine sentence — about the **hook and bridge only**, never
"The Nook" — as corrected by [FRE-354] `(j)`: the hook and bridge **are not a cloud
service**. Do not write "talk to nothing but your Mac" (too absolute: the
`NOOK_PORTS` fan-out resolves `host.docker.internal` and the default gateway, and
`defaultGateway()` opens a no-packet UDP socket to `8.8.8.8:80`), and do not narrow
it to "over SSH" (a tailnet peer dials directly).

It is verified as a code fact ([FRE-322] §2, [FRE-354] `(j)`), and it is still
**held** until the disclosures land: Sentry gated behind a preference or removed,
and `/privacy` + `/faq` corrected against the egress inventory (patch on branch
`faq/from-objections-2026-10-29`, verified by [FRE-354]). A true sentence next to
false ones is worse than no sentence.

### 4. Sell what works today

An iPhone + Apple Watch companion **is** in users' hands as a TestFlight beta
(`ios-v0.3.2`, 2026-10-22; [FRE-354] open question). That makes one thing true and
one thing forbidden: say "TestFlight beta" when the phone exists in a sentence at
all, and never claim approvals-from-phone as a shipped capability without its own
CTO verdict — no "(coming soon)" parentheticals either way.

Remote SSH is **held**, not approved: the one-click install has not
been verified end to end ([FRE-315] §1) and the shipped path needs hand-edited
`~/.ssh/config` and a one-time `ssh-copy-id` ([FRE-320]). Its copy stays parked in
`marketing/drafts/remote-ssh/` until the CTO verifies the shipping flow **and** a
recording shows a remote agent joining the notch.

### 5. Humans hold every account

No agent authenticates, posts, upvotes, or DMs. No sock puppets, no self-mention
without disclosure. `approved/` **is the only thing a human ever publishes from** —
nothing posts itself.

## Claims: status at 2026-10-29

Each row names the evidence, not a feeling. Re-read the verdict before using a row.

| Claim | Status | Evidence / next step |
|---|---|---|
| Approve an agent's tool call from the notch, and it carries on | **Needs demo** — not publishable | [FRE-322] §1. `AgentLiveTurnTests` has never run on a signed-in host; one observed local run settles it. Say "an agent", never "any agent", never "always". |
| Every agent you're running reports into one notch; the blocked one pins above the rest | **Verified by code, gated on the take** | [FRE-322] §3. Same one-Mac take as above. No count in the sentence. |
| The hook and bridge are not a cloud service | **Verified code fact, held on disclosure** | [FRE-322] §2, wording corrected by [FRE-354] `(j)`. Held until Sentry is gated/removed and `/privacy` + `/faq` land. Never widen to "The Nook", never "nothing but your Mac". |
| Fan, thermal and charge control | **No claim verdict yet — do not lead with it** | Backed by `helper/` (privileged helper, SMC, no kext), but no CTO sentence exists for it. Documentary, not launch. |
| One-time purchase, no subscription | **Publishable fact, price not a launch asset** | $10, held at $10. No dated rise, no discount framing, no pricing copy. |
| Agent coverage numbers ("thirteen agents", "8 agents", "all your agents") | **Excluded** | 18 agent specs; 9 can raise an approval card ([FRE-322] §1 matrix); 13 appear in the shipped corpus matrix. No count is publishable. |
| macOS 14.2 or later | **Publishable fact** | The app cannot start below 14.2 (`freno-dev` `881190d`, site `134f41e`). "macOS 14+" is false and was fixed on the site. |
| Remote agents over SSH, one click to install | **Held** | [FRE-315] §1, [FRE-320], [FRE-323]. Needs a verified one-click install plus a recording. |
| "Nothing leaves your Mac", "no telemetry", "local-only", "no account" | **False today — banned** | Sentry unconditional, licence check with hardware fingerprint ([FRE-322] §2.4). |
| Approvals from the iPhone or Apple Watch | **No verdict — not a launch claim** | The companion is a TestFlight beta ([FRE-354]); the approval-from-phone claim has no CTO verdict and stays out of launch copy. |

## Voice

- Short, concrete, no hype adjectives. Numbers over adjectives — but no coverage
  counts (see the excluded row above).
- The notch is the product's home; agents are the product's point.
- Never apologize for being a utility. The utility is the point.
- Banned phrasings: competitor names (see rule 1), "AI-powered", "revolutionary",
  "game-changer", "seamlessly", any unverifiable superlative — and the specific
  banned sentences in rule 3 and the table above.
