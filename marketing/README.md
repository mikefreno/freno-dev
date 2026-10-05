# Marketing tree

One voice, one place. Every later artifact draws on `positioning.md` — do not
invent framing per-asset.

```
positioning.md        # source of truth: wedge, voice, banned phrasings, approved claims
calendar.json         # scheduled pushes: date, channel, status
briefs/<channel>.md   # per-channel rules, format, limits, what "good" looks like
drafts/<id>/          # agent output: copy.md, assets/, rationale.md
pending/ approved/ posted/   # human gate by directory move
metrics/weekly.md     # funnel snapshot, generated
listening.md          # buying-intent threads + drafted replies
```

## Hard rule

**`approved/` is the only thing a human ever publishes from. Nothing posts itself.**

Workflow: agent drafts into `drafts/<id>/` → moves to `pending/` when complete →
a human reviews and moves it to `approved/` → the human publishes from `approved/`
under their own account → the artifact (or a pointer) lands in `posted/`.

Nothing in `drafts/` or `pending/` is ever publishable, by anyone, by any means.
