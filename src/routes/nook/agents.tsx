/**
 * `/agents` on the Nook subdomain — supported agents and their event coverage.
 *
 * The registry below mirrors `AgentSpec.all` in the app
 * (~/Code/the-nook/Sources/NookCore/Agents/AgentSpec.swift) and each agent's
 * installed hook surface (hook/setup.go) or plugin event subscription
 * (plugins/*), normalized onto the shared event vocabulary
 * (~/Code/the-nook/docs/agent-interface.md). Copy follows
 * marketing/positioning.md: category nouns, honest scoping, no unverifiable
 * claims.
 */
import { For } from "solid-js";
import { PageHead } from "~/components/PageHead";
import { EdgeCacheHeaders } from "~/components/EdgeCacheHeaders";
import SubdomainHeader from "~/components/SubdomainHeader";

interface AgentEntry {
  name: string;
  /** How The Nook connects to this agent. */
  wiring: string;
  /** Events the installed hook/plugin reports, on the shared vocabulary. */
  events: string[];
  /** What the agent can be asked to do from a Nook card. */
  gating: string;
}

const AGENTS: AgentEntry[] = [
  {
    name: "Claude Code",
    wiring: "Hook entries in its settings, calling the shared hook binary",
    events: [
      "UserPromptSubmit",
      "SessionStart",
      "SessionEnd",
      "Stop",
      "StopFailure",
      "SessionError",
      "SubagentStart",
      "SubagentStop",
      "Notification",
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "PostToolUseFailure",
      "PermissionDenied",
      "PreCompact"
    ],
    gating:
      "Full — tool calls and permission prompts can be allowed or denied from a card"
  },
  {
    name: "Codex",
    wiring: "Hook entries in its config, with its hooks feature enabled",
    events: [
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "Stop",
      "SessionError"
    ],
    gating:
      "Full — command/file approvals and user-input questions can be answered from a card"
  },
  {
    name: "OpenCode",
    wiring: "In-process plugin on its server bus",
    events: [
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "Stop",
      "SessionError",
      "MessageUpdate",
      "PermissionRequest",
      "QuestionAsked"
    ],
    gating:
      "Full — the plugin answers OpenCode's own permission API when you tap Allow or Deny"
  },
  {
    name: "Pi",
    wiring: "In-process extension registered in its settings",
    events: [
      "SessionStart",
      "SessionEnd",
      "AgentStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "Stop",
      "SessionError",
      "MessageUpdate",
      "QuestionAsked",
      "QuestionResolved"
    ],
    gating:
      "Full when you force verification — Pi alone never asks natively, so the gate engages on the approval tool"
  },
  {
    name: "Oh My Pi",
    wiring: "In-process extension package",
    events: [
      "SessionStart",
      "SessionEnd",
      "AgentStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PermissionRequest",
      "PermissionResolved",
      "PostToolUse",
      "Stop",
      "SessionError",
      "MessageUpdate",
      "QuestionAsked",
      "QuestionResolved"
    ],
    gating:
      "Full — honors the agent's own approval tiers, per-tool policies included"
  },
  {
    name: "Muse",
    wiring:
      "Plugin installed, approved and enabled through Muse's own plugins CLI; each hook calls the shared hook binary. This Mac only — remote hosts skip it",
    events: [
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "PostToolUseFailure",
      "Stop",
      "StopFailure",
      "Notification",
      "PreCompact",
      "PostCompact",
      "SubagentStart",
      "SubagentStop"
    ],
    gating:
      "Full — permission prompts can be allowed or denied from a card, and every tool call under Verify"
  },
  {
    name: "Hermes",
    wiring:
      "Shell-hook entries in the agent's config, consent-gated by allowlist",
    events: [
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "Stop",
      "PreToolUse",
      "PostToolUse",
      "SubagentStart",
      "SubagentStop",
      "QuestionAsked"
    ],
    gating:
      "Observation — every event appears as a card; the agent keeps its own prompting"
  },
  {
    name: "OpenClaw",
    wiring: "Hook handler package in its hooks directory",
    events: [
      "SessionStart",
      "UserPromptSubmit",
      "Stop",
      "SessionError",
      "PreCompact",
      "SessionEnd"
    ],
    gating:
      "Observation — strict fire-and-forget; the agent surface has no tool or permission events"
  },
  {
    name: "Z.ai (ZCode)",
    wiring: "Hook entries in its CLI config",
    events: [
      "SessionStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "PostToolUseFailure",
      "Stop"
    ],
    gating:
      "Full — tool calls and permission prompts can be allowed or denied from a card"
  },
  {
    name: "Gemini CLI",
    wiring: "Hook entries in its settings",
    events: [
      "SessionStart",
      "SessionEnd",
      "AgentStart",
      "Stop",
      "SessionError",
      "Notification"
    ],
    gating:
      "Observation — every event appears as a card; the agent keeps its own prompting"
  },
  {
    name: "Cline",
    wiring: "One hook file per event in its hooks directory",
    events: [
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "Stop",
      "PreCompact",
      "Notification"
    ],
    gating:
      "Observation — every event appears as a card; the agent keeps its own prompting"
  },
  {
    name: "Qwen Code",
    wiring:
      "Hook entries in its settings (same surface as the Claude-style schema)",
    events: [
      "UserPromptSubmit",
      "SessionStart",
      "SessionEnd",
      "Stop",
      "StopFailure",
      "SubagentStart",
      "SubagentStop",
      "Notification",
      "PreToolUse",
      "PermissionRequest",
      "PostToolUse",
      "PostToolUseFailure",
      "PermissionDenied",
      "PreCompact"
    ],
    gating:
      "Full — tool calls and permission prompts can be allowed or denied from a card"
  },
  {
    name: "DeepSeek",
    wiring: "A standalone hooks file its bridge is pointed at",
    events: [
      "SessionStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "Stop",
      "SubagentStart",
      "SubagentStop"
    ],
    gating:
      "Tool calls can be allowed or denied from a card; permission prompts stay with the agent"
  }
];

const GATING_BADGE: Record<string, { label: string; class: string }> = {
  full: {
    label: "Allow / Deny from a card",
    class: "text-green border-green/40 bg-green/10"
  },
  observation: {
    label: "Observe",
    class: "text-blue border-blue/40 bg-blue/10"
  }
};

function gatingKey(entry: AgentEntry): "full" | "observation" {
  return entry.gating.startsWith("Full") ? "full" : "observation";
}

export default function NookAgentsPage() {
  return (
    <>
      <EdgeCacheHeaders maxAge={300} />
      <PageHead
        title="Supported agents"
        description="Every coding agent The Nook supports — all thirteen, with each hook's exact event coverage and what you can do from a card: watch sessions live, answer permission prompts, unblock work."
        ogTitle="The 13 agents The Nook supports, and what each hook sees"
      />
      <SubdomainHeader />
      <main class="min-h-screen px-[8vw] py-[8vh]">
        <h1 class="text-text mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Supported agents
        </h1>
        <p class="text-subtext0 mb-2 max-w-2xl text-lg">
          The Nook watches thirteen coding agents in one place — your menu bar and
          notch show every session that is running, thinking, or blocked, and a
          card answers permission prompts without leaving your keyboard.
        </p>
        <p class="text-subtext1 mb-10 max-w-2xl text-sm">
          Each agent reports its own set of events. "Allow / Deny from a card"
          means the agent hands the decision to The Nook while it waits;
          "Observe" means every event still appears live, but the agent keeps
          its own prompting.
        </p>

        <div class="grid gap-4 lg:grid-cols-2">
          <For each={AGENTS}>
            {(agent) => (
              <article class="border-overlay0 bg-surface0/40 rounded-2xl border p-5">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <h2 class="text-text text-lg font-semibold">{agent.name}</h2>
                  <span
                    class={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${GATING_BADGE[gatingKey(agent)].class}`}
                  >
                    {GATING_BADGE[gatingKey(agent)].label}
                  </span>
                </div>
                <p class="text-subtext0 mb-3 text-sm">{agent.wiring}</p>
                <p class="text-subtext1 mb-1 text-xs font-semibold tracking-wide uppercase">
                  Events reported
                </p>
                <div class="mb-3 flex flex-wrap gap-1.5">
                  <For each={agent.events}>
                    {(event) => (
                      <code class="border-overlay0 bg-base text-subtext0 rounded-md border px-2 py-0.5 font-mono text-xs">
                        {event}
                      </code>
                    )}
                  </For>
                </div>
                <p class="text-subtext0 text-sm">{agent.gating}</p>
              </article>
            )}
          </For>
        </div>

        <p class="text-subtext1 mt-10 max-w-2xl text-sm">
          Running something else? A custom agent can wire itself in with the
          same one-line contract the built-in integrations use.
        </p>
      </main>
    </>
  );
}
