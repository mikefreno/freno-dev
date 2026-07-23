# Subdomain Setup — freno.me

This document records the DNS and Vercel domain configuration for the four product subdomains.

## DNS Configuration

**DNS Provider:** Google Domains (nameservers: `ns-cloud-a1` through `ns-cloud-a4.googledomains.com`)

Add the following CNAME records in the [Google Domains DNS console](https://domains.google.com/registrar/freno.me/dns):

| Subdomain | Type | Target | TTL |
|---|---|---|---|
| `nessa` | CNAME | `cname.vercel-dns.com` | Automatic |
| `lineage` | CNAME | `cname.vercel-dns.com` | Automatic |
| `gaze` | CNAME | `cname.vercel-dns.com` | Automatic |
| `inputhalo` | CNAME | `cname.vercel-dns.com` | Automatic |

**After adding records:** Wait for DNS propagation (typically minutes) and for Vercel to auto-issue SSL certificates for each subdomain.

## Vercel Project Domains

Add the following domains in the [Vercel project Settings → Domains](https://vercel.com/your-team/freno-dev/settings/domains):

| Domain | Redirects to |
|---|---|
| `nessa.freno.me` | (no redirect — serves `src/routes/nessa/*` via vercel.json rewrite) |
| `lineage.freno.me` | (no redirect — serves `src/routes/lineage/*` via vercel.json rewrite) |
| `gaze.freno.me` | (no redirect — serves `src/routes/gaze/*` via vercel.json rewrite) |
| `inputhalo.freno.me` | (no redirect — serves `src/routes/inputhalo/*` via vercel.json rewrite) |

**Do NOT set any of these as the Production Branch domain** — `freno.me` remains the production domain.

## Rewrite Architecture (`vercel.json`)

The rewrites are defined in `vercel.json` with **two groups, ordered precisely**:

### Group 1: `/api/*` pass-throughs (must come first)

```json
{ "source": "/api/(.*)", "has": [{ "type": "host", "value": "gaze.freno.me" }], "destination": "/api/$1" }
{ "source": "/api/(.*)", "has": [{ "type": "host", "value": "inputhalo.freno.me" }], "destination": "/api/$1" }
{ "source": "/api/(.*)", "has": [{ "type": "host", "value": "nessa.freno.me" }], "destination": "/api/$1" }
{ "source": "/api/(.*)", "has": [{ "type": "host", "value": "lineage.freno.me" }], "destination": "/api/$1" }
```

These pass API requests on subdomains straight through to the existing `/api/*` routes. This enables **dual-host Sparkle appcast support**: `gaze.freno.me/api/Gaze/appcast.xml` hits the same `src/routes/api/Gaze/appcast.xml.ts` route as `freno.me/api/Gaze/appcast.xml`.

### Group 2: `/(.*)` catch-all rewrites

```json
{ "source": "/(.*)", "has": [{ "type": "host", "value": "nessa.freno.me" }], "destination": "/nessa/$1" }
{ "source": "/(.*)", "has": [{ "type": "host", "value": "lineage.freno.me" }], "destination": "/lineage/$1" }
{ "source": "/(.*)", "has": [{ "type": "host", "value": "gaze.freno.me" }], "destination": "/gaze/$1" }
{ "source": "/(.*)", "has": [{ "type": "host", "value": "inputhalo.freno.me" }], "destination": "/inputhalo/$1" }
```

These rewrite non-API requests on each subdomain to its internal route prefix. Vercel matches top-to-bottom, so the `/api/*` rules above catch API paths first.

## Verification Checklist

After DNS propagation and Vercel certificate issuance:

- [ ] `dig nessa.freno.me` returns the Vercel CNAME
- [ ] `dig lineage.freno.me` returns the Vercel CNAME
- [ ] `dig gaze.freno.me` returns the Vercel CNAME
- [ ] `dig inputhalo.freno.me` returns the Vercel CNAME
- [ ] `curl -sI https://nessa.freno.me/ | head -1` → `HTTP/2 200`
- [ ] `curl -sI https://lineage.freno.me/ | head -1` → `HTTP/2 200`
- [ ] `curl -sI https://gaze.freno.me/ | head -1` → `HTTP/2 200`
- [ ] `curl -sI https://inputhalo.freno.me/ | head -1` → `HTTP/2 200`
- [ ] `curl -sI https://freno.me/api/Gaze/appcast.xml | head -1` → `HTTP/2 200` (regression)
- [ ] `curl -sI https://freno.me/api/InputHalo/appcast.xml | head -1` → `HTTP/2 200` (regression)
- [ ] `curl -sI https://freno.me/ | head -1` → `HTTP/2 200` (regression)
- [ ] All four subdomains have valid SSL certificates (no browser warnings)

## Auth Boundaries

Auth remains **host-scoped** — no cookie domain broadening:

- `freno.me` web JWT cookies: host-only on `freno.me`
- Nessa: Clerk session tokens (independent)
- Lineage: mobile JWT (independent)
- Gaze/InputHalo: no web auth

## Notes

- DNS records must be added at **Google Domains** (not Vercel's DNS) since freno.me uses Google's nameservers.
- Subdomains will 404 until route files exist in `src/routes/<prefix>/*` (content tasks 05–11).
- The `bun run build` gate is worktree-friendly; run it before deploying.
