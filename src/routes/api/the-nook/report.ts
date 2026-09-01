import type { APIEvent } from "@solidjs/start/server";
import { z } from "zod";
import sendEmail from "~/server/email";
import { CONTACT_RECIPIENT_EMAIL } from "~/lib/contact-config";
import { takeBugReportToken } from "~/server/bug-report-rate-limit";
import { json, error } from "./_lib";

/**
 * POST /api/the-nook/report
 * Body: { appVersion, title, description, contact?, machine, displays }
 *
 * Emails the developer a Nook bug report in plain prose — each field on
 * its own line. The Mac client collects the machine facts itself (model,
 * CPU, memory, every display); styling is irrelevant, information is the
 * product here.
 */

const displaySchema = z.object({
  name: z.string().max(200).default(""),
  boundsPx: z.string().max(100).default(""),
  scale: z.string().max(20).default(""),
  hz: z.string().max(20).default(""),
  builtin: z.boolean().default(false)
});

const reportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(20_000).default(""),
  contact: z.string().trim().max(254).default(""),
  appVersion: z.string().trim().max(100).default(""),
  machine: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({}),
  displays: z.array(displaySchema).max(8).default([])
});

type Report = z.infer<typeof reportSchema>;

const contactRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One escaping contract for every interpolated string (many call sites).
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBody(report: Report): string {
  const machineLines = Object.entries(report.machine).map(
    ([key, value]) => `<b>${escapeHtml(key)}:</b> ${escapeHtml(String(value))}`
  );
  const displayLines = report.displays.map((display) =>
    [
      `<b>name:</b> ${escapeHtml(display.name)}`,
      `<b>boundsPx:</b> ${escapeHtml(display.boundsPx)}`,
      `<b>scale:</b> ${escapeHtml(display.scale)}`,
      `<b>hz:</b> ${escapeHtml(display.hz)}`,
      `<b>builtin:</b> ${escapeHtml(String(display.builtin))}`
    ].join(" · ")
  );

  return [
    `<h2>The Nook bug report</h2>`,
    `<h3>“${escapeHtml(report.title)}”</h3>`,
    report.description
      ? `<h3>What happened</h3><div>${escapeHtml(report.description).replace(/\r\n|\n|\r/g, "<br>")}</div>`
      : "",
    report.contact && contactRe.test(report.contact)
      ? `<p><b>Reply-to:</b> ${escapeHtml(report.contact)}</p>`
      : "",
    `<h3>Snapshot</h3>`,
    report.appVersion ? `<p><b>${escapeHtml(report.appVersion)}</b></p>` : "",
    machineLines.length > 0 ? `<p>${machineLines.join("<br>")}</p>` : "",
    displayLines.length > 0
      ? `<h3>Displays</h3><div>${displayLines.map((line) => `<div>${line}</div>`).join("")}</div>`
      : ""
  ]
    .filter((chunk) => chunk !== "")
    .join("\n");
}

export async function POST(event: APIEvent): Promise<Response> {
  let raw: unknown;
  try {
    raw = await event.request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    return error("Invalid report", 400);
  }
  const report = parsed.data;
  if (report.contact && !contactRe.test(report.contact)) {
    return error("Invalid reply-to email", 400);
  }

  const fingerprint = (
    event.request.headers.get("x-nook-fingerprint") ?? ""
  )
    .trim()
    .toLowerCase();
  const forwarded = event.request.headers.get("x-forwarded-for");
  const rateKey =
    fingerprint ||
    (forwarded ? forwarded.split(",")[0]!.trim() : "unknown");
  const token = takeBugReportToken(rateKey);
  if (!token.allowed) {
    return new Response(JSON.stringify({ error: "Too many reports" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(token.retryAfterSec ?? 3600)
      }
    });
  }

  const subject = `The Nook bug report: ${report.title.slice(0, 100)}`;
  const result = await sendEmail(
    CONTACT_RECIPIENT_EMAIL,
    subject,
    renderBody(report)
  );
  if (!result.success) {
    return error("Failed to send report", 500);
  }
  return json({ success: true });
}
