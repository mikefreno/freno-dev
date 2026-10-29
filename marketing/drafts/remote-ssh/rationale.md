# Why the remote claim is parked

The site was selling a setup path a buyer does not get.

FRE-320 measured today's actual path (2026-10-29): the one-click flow is
app-UI-only, needs a hand-edited `~/.ssh/config` for any host not already in ssh
config or on the tailnet, needs a one-time `ssh-copy-id` because the app runs ssh
with `BatchMode=yes`, and has no manual fallback for minting the per-host
credential. FRE-315 and FRE-322 §3 correction 4 marked the remote claim
unverified and demo-gated. The CTO named it the largest launch risk because it
was already in front of buyers.

So the `freno-dev` source now says only what the product can back today: local
agents, the card, and the notch. That correction is committed locally and is
**not deployed** — the live page still carries the remote sentences until the
push in FRE-323 card `82d1e1b7` lands. The remote story is not deleted — it is
parked here with the FRE-320/FRE-205 work so it can return the day the one-click
install ships and is recorded.

## What has to be true before it returns

| Requirement | Owner | Date |
|---|---|---|
| One-click install ships without hand-edited `~/.ssh/config` or `ssh-copy-id` | FRE-320/FRE-205 engineering | When FRE-320/FRE-205 ships |
| CTO verifies the shipping flow and records the evidence on FRE-320 | CTO | Same day, before any copy moves |
| A recording shows a remote agent joining the island | Sponsor/CMO | Before restore |
| Restore copy and rebuild the launch plan with an owner + date per item | CMO | Day the three rows above are true |

Nothing in this folder is publishable. `marketing/approved/` remains the only
place a human publishes from.
