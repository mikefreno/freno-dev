// Releases older than the appcast's retention, recovered from the
// changelog file's git history (The-Nook 1ad8a69 / db165cd) and checked
// in so /changelog renders the full story. 0.3.1 and 0.6.1 shipped
// without written notes and are absent by design. Generated with the
// same section->HTML rules as embed_release_notes.py.
export interface ArchivedRelease {
  version: string;
  date: string;
  notesHtml: string;
}

export const ARCHIVED_RELEASES: ArchivedRelease[] = [
  {
    "version": "0.5.0",
    "date": "2026-09-07",
    "notesHtml": "<p><b>Added</b></p><ul><li>Agent plugins detected as drifted, with reason and a Repair button.</li><li>Keep Mac awake during agent runs while sessions are active (Advanced settings).</li><li>Release notes card in General settings, plus changelog in update descriptions.</li></ul><p><b>Changed</b></p><ul><li>Charge-limit and fan controls wait until a matching helper build is installed.</li><li>Fans and OS notifications show an Enable-helper option where needed.</li><li>Code was reorganized into clearer folders, with no behavior change.</li></ul><p><b>Fixed</b></p><ul><li>Keep Mac awake during agent runs: Advanced settings holds off idle sleep while any agent is working or waiting on you.</li><li>Settings open reliably from the island gear menu.</li><li>Privileged operations use one installer path with consistent signing; fan control and charge limiting work correctly again.</li><li>Temperature sensor selection sources readings reliably.</li><li>opencode sessions keep the model identity through Stop envelopes.</li></ul>"
  },
  {
    "version": "0.4.1",
    "date": "2026-09-06",
    "notesHtml": "<p><b>Fixed</b></p><ul><li>Settings not opening from the island gear menu.</li></ul>"
  },
  {
    "version": "0.4.0",
    "date": "2026-09-06",
    "notesHtml": "<p><b>Added</b></p><ul><li>First-run onboarding: interests, panel shaping, slot choices; replayable from Settings.</li><li>Day modules: tap-to-edit events, calendar-color dots, access gates.</li><li>Power flow and significant-energy sections, charge limit top-up mode.</li><li>Ship DMG installer with appcast; drop the zip.</li><li>Report a bug from the About pane; Sentry crash reporting.</li></ul><p><b>Changed</b></p><ul><li>Agent approvals terminology; island &quot;Collapsed&quot; renamed to &quot;Compact&quot;.</li><li>Bridge endpoint baked into `~/.nook/endpoint` for plugins.</li><li>Plug/charge state read from IOPS (registry keys lag ~30 s).</li><li>License check timeout improved.</li></ul><p><b>Fixed</b></p><ul><li>Call-detection scrim faked rings; nil panel ids crashed Settings unwraps; media-key tap teardown leaked run-loop sources; empty sessions read in-flight; interrupted pi turn sent no last assistant message.</li></ul>"
  },
  {
    "version": "0.3.0",
    "date": "2026-09-05",
    "notesHtml": "<p><b>Added</b></p><ul><li>Call band: caller photo, live waveform, route pickers, banner suppression.</li><li>Music interception service and battery thermal service.</li><li>Power panel: wall-input wattage, charge limit policy, top-up mode.</li><li>External brightness controls; keyboard system; global slot ordering.</li><li>Report-a-bug About entry; Sentry crash and performance reporting.</li></ul><p><b>Changed</b></p><ul><li>Island sequencing deepened behind IslandSurface; settings unified behind PaneShell.</li><li>Media-key handling: peek stacks for call and media bands.</li></ul><p><b>Fixed</b></p><ul><li>NowPlaying auto-pause for browser sources; battery module; sizing and expansion bugs.</li></ul>"
  },
  {
    "version": "0.2.0",
    "date": "2026-08-26",
    "notesHtml": "<p><b>Added</b></p><ul><li>Agent session cards: status verbs, slot config sheet, approvals.</li><li>Media, call, power, Day modules; Settings with per-pane cards.</li></ul><p><b>Fixed</b></p><ul><li>Initial public reliability pass.</li></ul>"
  }
];
