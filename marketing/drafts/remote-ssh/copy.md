# Remote SSH copy — HELD, do not publish

**Status:** removed from the `freno-dev` source on 2026-10-29 in the FRE-323
correction, and **not yet off the live site** — the deploy is blocked on a write
credential to `mikefreno/freno-dev` (card `82d1e1b7`). `nook.freno.me` still
serves every sentence below until that push or a Vercel deploy lands.
**Owner:** CMO. **Verified by:** CTO, on the FRE-320/FRE-205 work.
**Restore only when:** FRE-320/FRE-205 ship a genuinely one-click install, the CTO
verifies that flow, and a recording shows a remote agent joining the island.
Until then this file is the only home for these sentences.

## What was removed

### 1. Landing collage tile

Source: `src/components/nook/FeatureCollage.tsx` (removed 2026-10-29).

```
kicker: Remote
title:  Agents on other machines
body:   Run agents on Linux boxes and SSH servers — one click installs the
        nook-hook, and their sessions join the same island.
```

The mock attached to it showed two session rows whose agent chips named
`build-box` and `gpu-rig`.

### 2. Landing feature breakdown section

Source: `src/components/nook/FeatureBreakdowns.tsx` (removed 2026-10-29).

```
kicker: Remote
title:  Any SSH box, one click away
body:   Pick a host from your ssh config or your tailnet and click once — the
        nook-hook installs itself and its agents appear beside your local ones,
        indistinguishable.

bullets:
- One click: connect, push the hook, configure agents, check it can reach this Mac
- Hosts mirror this Mac's installed integrations automatically
- Remote sessions are ordinary rows; the agent chip names the machine
```

The section's demo animated a `gpu-rig` host moving from "Not set up" through
`connecting` → `pushing the hook binary` → `configuring agents` → `checking the
host can reach this Mac` → `Live`, then showed a remote session row.

### 3. Approvals bullet

Source: `src/components/nook/FeatureBreakdowns.tsx` (removed 2026-10-29).

```
- Works across every hooked agent, local or remote
```

### 4. Feature chip

Source: `src/components/nook/IslandExtras.tsx` (removed 2026-10-29).

```
One-click SSH setup
```

## What replaced it

Nothing. The Remote tile and section were removed rather than replaced; the
existing Approvals cell already carries the verified local claim:

> Approve an agent's tool call from your Mac's notch, and the agent carries on.

## Restore checklist

1. FRE-320/FRE-205 have shipped the one-click install and removed the
   `~/.ssh/config` / `ssh-copy-id` friction described in FRE-320.
2. The CTO has verified the shipping flow and the evidence is on FRE-320.
3. A recording exists showing a remote agent joining the island.
4. CMO restores the copy above, then owns the launch plan for it — with an
   owner and date per item — before anything goes back on the site.
