# Remote SSH copy — historical unqualified wording

[gpt-6.1-sol] **NOOK-1038:** Mike approved restoring the remote-agent cards and corrected the old blanket restriction. One-click setup works for **Tailscale and authorized known hosts**. The current page describes that scope; this file preserves the old unqualified wording for reference, not for verbatim reuse.

[gpt-6.1-sol] The earlier FRE-323 removal treated SSH authorization needed by a new host as though it prevented one-click setup for hosts already authorized. Current evidence is `RemoteHostCatalog.discover`, `RemoteHostsController.setUp`, `RemoteMirror.apply`, and the existing `RemoteHostsControllerLiveTests.setUpLeavesItLive` test. No new live-host test run is claimed by this website change.

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

## Current restoration

[gpt-6.1-sol] NOOK-1038 restores the collage's Remote tile, host-labelled session examples, and the detailed setup section. The collage says: “One-click setup for Tailscale and authorized known hosts.” The detailed section shows choosing a discovered host, clicking Set up, installation progress, and Live status.

[gpt-6.1-sol] The historical “Any SSH box” claim, universal agent-coverage bullet, and unqualified setup chip above are not restored. Discovery and an existing authorization path are not the same as granting access to a new machine. This does not limit or deny the working one-click flow for authorized hosts.
