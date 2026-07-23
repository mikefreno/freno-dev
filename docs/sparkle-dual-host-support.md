# Sparkle Appcast Dual-Host Support

This document describes the dual-host support for Sparkle appcast and DMG download endpoints, enabling both legacy (`freno.me`) and new subdomain (`*.freno.me`) URLs to work with a single code path.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Vercel Edge                                  │
│                                                                           │
│  gaze.freno.me/api/Gaze/appcast.xml ───┐                                  │
│  inputhalo.freno.me/api/InputHalo/... ─┼──► /api/(.*) pass-through ──► │
│  freno.me/api/Gaze/appcast.xml ────────┘          rewrite               │
│                                     ▼                                     │
│                              /api/Gaze/appcast.xml                       │
│                                  │                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │                                        │
                                  ▼                                        │
┌─────────────────────────────────────────────────────────────────────────┐
│                              Node.js Server                              │
│                                                                           │
│  src/routes/api/Gaze/appcast.xml.ts                                     │
│  src/routes/api/InputHalo/appcast.xml.ts                                │
│  src/routes/api/downloads/[filename].ts                                  │
│                                  │                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │                                        │
                                  ▼                                        │
┌─────────────────────────────────────────────────────────────────────────┐
│                              AWS S3                                       │
│                                                                           │
│  frenomedownloads/api/Gaze/appcast.xml                                   │
│  frenomedownloads/api/InputHalo/appcast.xml                              │
│  frenomedownloads/downloads/Gaze-0.7.8.dmg                               │
│  frenomedownloads/downloads/InputHalo-0.5.2.dmg                           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## URL Routing Strategy

### Pass-Through Rewrite Pattern

Vercel JSON rewrites route subdomain API requests to the shared `/api/*` route pool:

```json
{
  "rewrites": [
    // API pass-throughs (MUST come before catch-all)
    { "source": "/api/(.*)", "has": [{ "type": "host", "value": "gaze.freno.me" }], "destination": "/api/$1" },
    { "source": "/api/(.*)", "has": [{ "type": "host", "value": "inputhalo.freno.me" }], "destination": "/api/$1" },
    { "source": "/api/(.*)", "has": [{ "type": "host", "value": "nessa.freno.me" }], "destination": "/api/$1" },
    { "source": "/api/(.*)", "has": [{ "type": "host", "value": "lineage.freno.me" }], "destination": "/api/$1" },
    
    // Catch-all subdomain rewrites
    { "source": "/(.*)", "has": [{ "type": "host", "value": "gaze.freno.me" }], "destination": "/gaze/$1" },
    { "source": "/(.*)", "has": [{ "type": "host", "value": "inputhalo.freno.me" }], "destination": "/inputhalo/$1" },
    // ...
  ]
}
```

**Why pass-through instead of redirect?**
- Sparkle follows redirects but pass-through is transparent (no HTTP 301)
- Avoids edge-client quirks
- Single code path in `src/routes/api/*`
- No new route files created

## Endpoints

### Appcast XML

| Product | Legacy URL | New Subdomain URL |
|---------|------------|-------------------|
| Gaze | `https://freno.me/api/Gaze/appcast.xml` | `https://gaze.freno.me/api/Gaze/appcast.xml` |
| InputHalo | `https://freno.me/api/InputHalo/appcast.xml` | `https://inputhalo.freno.me/api/InputHalo/appcast.xml` |

Both URLs return byte-identical XML with:
- `Content-Type: application/xml; charset=utf-8`
- `Cache-Control: public, max-age=300`
- `Access-Control-Allow-Origin: *`

### DMG Downloads

| Product | URL Pattern |
|---------|-------------|
| Gaze | `https://*.freno.me/api/downloads/Gaze-{version}.dmg` |
| InputHalo | `https://*.freno.me/api/downloads/InputHalo-{version}.dmg` |

Works from all five hosts: `freno.me`, `gaze.freno.me`, `inputhalo.freno.me`, `nessa.freno.me`, `lineage.freno.me`

## Enclosure URL Strategy

### Current State (Absolute freno.me URLs)

Appcast XML in S3 uses absolute URLs for enclosures:

```xml
<enclosure url="https://freno.me/api/downloads/Gaze-0.7.8.dmg" 
           length="5354270" 
           type="application/octet-stream" 
           sparkle:edSignature="..."/>
```

**Advantages:**
- Resolves from any host (freno.me or subdomain)
- No S3-side XML change needed
- Single appcast file serves all hosts

### Alternative (Relative URLs)

Could switch to relative URLs:
```xml
<enclosure url="/api/downloads/Gaze-0.7.8.dmg" .../>
```

**Trade-offs:**
- Would resolve against the serving host
- Requires regenerating appcast with `generate_appcast` / `.manage_sparkle.py`
- Not required for dual-host support

## EdDSA Signatures

Sparkle EdDSA signatures are **host-independent**:
- Signature is computed over DMG bytes, not the URL
- Serving the same DMG from `gaze.freno.me` instead of `freno.me` does not break verification
- No signature regeneration needed

## SUFeedURL Migration for New Builds

### Current (Legacy) SUFeedURL

Existing installed apps use:
- Gaze: `https://freno.me/api/Gaze/appcast.xml`
- InputHalo: `https://freno.me/api/InputHalo/appcast.xml`

These continue to work indefinitely via the pass-through rewrite.

### New SUFeedURL (For New Builds)

**Action Required in Swift Repos:**

#### Gaze (`~/Code/Gaze/`)
Set `SUFeedURL` in Info.plist to:
```
https://gaze.freno.me/api/Gaze/appcast.xml
```

#### InputHalo (`~/Code/InputHalo/`)
Set `SUFeedURL` in Info.plist to:
```
https://inputhalo.freno.me/api/InputHalo/appcast.xml
```

**Note:** Keep old builds on legacy URLs — they continue working via pass-through.

## Verification

### Automated Verification Script

```bash
# Verify all products
./scripts/verify-sparkle-dual-host.sh

# Verify specific product
./scripts/verify-sparkle-dual-host.sh Gaze
./scripts/verify-sparkle-dual-host.sh InputHalo
```

### Manual Verification

#### Appcast Byte-Identical Check
```bash
# Gaze
diff <(curl -s https://gaze.freno.me/api/Gaze/appcast.xml) \
     <(curl -s https://freno.me/api/Gaze/appcast.xml)
# Expected: no output (identical)

# InputHalo
diff <(curl -s https://inputhalo.freno.me/api/InputHalo/appcast.xml) \
     <(curl -s https://freno.me/api/InputHalo/appcast.xml)
# Expected: no output (identical)
```

#### DMG Download Check
```bash
# Gaze
curl -sI https://gaze.freno.me/api/downloads/Gaze-0.7.8.dmg | head -1
# Expected: HTTP/2 200

# InputHalo
curl -sI https://inputhalo.freno.me/api/downloads/InputHalo-0.5.2.dmg | head -1
# Expected: HTTP/2 200
```

#### Sparkle Update Check (Native App)
1. Set dev build's `SUFeedURL` to subdomain URL
2. In app: "Check for Updates..." → Should find new version
3. Verify download completes successfully

## Troubleshooting

### Appcast Returns 404
- Check S3 bucket: `aws s3 ls s3://frenomedownloads/api/{Product}/`
- Verify appcast XML file exists
- Check server logs for S3 errors

### Appcast Returns 500
- Check S3 credentials in Vercel environment
- Verify bucket policy allows read access
- Check server logs for S3 errors

### Content Differs Between Hosts
- Check vercel.json rewrite ordering
- Verify `/api/(.*)` pass-throughs come before `/(.*)` catch-alls
- Check for caching issues (clear browser cache, use different browser)

### DMG Download Fails
- Verify DMG file exists in S3: `aws s3 ls s3://frenomedownloads/downloads/`
- Check filename format (must start with `Gaze` or `InputHalo`, end with `.dmg` or `.delta`)
- Check server logs for S3 errors

## Related Files

| File | Description |
|------|-------------|
| `vercel.json` | Host-based rewrites configuration |
| `src/routes/api/Gaze/appcast.xml.ts` | Gaze appcast route |
| `src/routes/api/InputHalo/appcast.xml.ts` | InputHalo appcast route |
| `src/routes/api/downloads/[filename].ts` | DMG download route |
| `scripts/verify-sparkle-dual-host.sh` | Verification script |
| `~/Code/Gaze/` | Gaze native app (SUFeedURL change) |
| `~/Code/InputHalo/` | InputHalo native app (SUFeedURL change) |

## Acceptance Criteria

- [x] `gaze.freno.me/api/Gaze/appcast.xml` returns byte-identical XML to `freno.me/api/Gaze/appcast.xml`
- [x] `inputhalo.freno.me/api/InputHalo/appcast.xml` returns byte-identical XML to `freno.me/api/InputHalo/appcast.xml`
- [x] DMG download endpoint serves real DMG binaries from all five hosts
- [x] Appcast response headers are correct (Content-Type, Cache-Control, CORS)
- [x] Enclosure URLs in appcast XML are absolute `freno.me` URLs
- [x] Sparkle EdDSA signatures are valid (host-independent)
- [ ] Dev build pointed at subdomain SUFeedURL successfully checks for + downloads update
- [ ] Existing build on legacy SUFeedURL is unaffected (no regression)
- [ ] SUFeedURL change for new builds is documented / filed against Gaze and InputHalo repos
