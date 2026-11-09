# Remote setup marketing decision

[gpt-6.1-sol] **NOOK-1038 supersedes the blanket hold.** Mike approved restoring remote-agent cards and confirmed one-click setup for **Tailscale and authorized known hosts**. The landing collage and detailed section should describe that working flow, not imply remote support is absent.

## Why it was removed

[gpt-6.1-sol] FRE-323 removed the entire remote story after FRE-320 identified SSH configuration and authorization steps for hosts that were not ready to connect. That restriction was too broad: those prerequisites do not prevent a discovered, authorized host from being set up with one click. The historical unqualified copy remains in `copy.md` so the change in scope is explicit.

## Current evidence and scope

[gpt-6.1-sol] `RemoteHostCatalog.discover` reads SSH config and Tailscale peers. `RemoteHostsController.setUp` binds the bridge and calls `RemoteMirror.apply`, which connects, installs the hook and applicable integrations, and probes the return path. The existing `RemoteHostsControllerLiveTests.setUpLeavesItLive` test exercises this same controller against a configured real host; this website change does not claim a new live-host run.

[gpt-6.1-sol] Publish the scoped one-click flow and show remote sessions labelled with their host names. Do not replace it with a “manual setup only” disclaimer. Do not widen it to every SSH server, access without authorization, or every agent. The app's Remote hosts pane handles authorization failures separately from successful setup.
