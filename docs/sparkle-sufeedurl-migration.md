# SUFeedURL Migration for New Native Builds

This document tracks the `SUFeedURL` change needed in the Gaze and InputHalo native Swift repos to use subdomain-based feed URLs.

## Status

- [ ] Gaze: Update `SUFeedURL` in Info.plist (~/Code/Gaze/)
- [ ] InputHalo: Update `SUFeedURL` in Info.plist (~/Code/InputHalo/)

## SUFeedURL Changes

### Gaze

**File:** `~/Code/Gaze/` — Info.plist

**Current (Legacy):**
```
https://freno.me/api/Gaze/appcast.xml
```

**New (Subdomain):**
```
https://gaze.freno.me/api/Gaze/appcast.xml
```

### InputHalo

**File:** `~/Code/InputHalo/` — Info.plist

**Current (Legacy):**
```
https://freno.me/api/InputHalo/appcast.xml
```

**New (Subdomain):**
```
https://inputhalo.freno.me/api/InputHalo/appcast.xml
```

## Migration Notes

1. **Keep legacy URL working:** Old builds continue to work via the `/api/*` pass-through rewrite on Vercel
2. **No appcast regeneration needed:** The same S3 appcast files serve both URLs
3. **EdDSA signatures are host-independent:** No signature changes needed
4. **Test before release:** Verify Sparkle detects updates with the new subdomain URL in a dev build

## Verification Steps

1. Set `SUFeedURL` in Info.plist to new subdomain URL
2. Build the app
3. In the app: "Check for Updates..." → Should find the latest version
4. Verify the download completes successfully
5. Verify the EdDSA signature verification passes

## Related

- [Dual-Host Support Documentation](./sparkle-dual-host-support.md)
- [Verification Script](../scripts/verify-sparkle-dual-host.sh)
