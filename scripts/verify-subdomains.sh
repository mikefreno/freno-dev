#!/usr/bin/env bash
# Verify subdomain DNS propagation, SSL, and rewrite routing
# Run after DNS CNAMEs are added and Vercel domains are configured.

set -euo pipefail

SUBDOMAINS=("nessa" "lineage" "gaze" "inputhalo")
APICAST_ROUTES=("Gaze" "InputHalo")
PASS=0
FAIL=0

check() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "✗ $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== DNS CNAME propagation ==="
for sub in "${SUBDOMAINS[@]}"; do
  cname=$(dig +short "$sub.freno.me" 2>/dev/null | grep -i "cname.vercel-dns.com" || true)
  if [[ -n "$cname" ]]; then
    check "$sub.freno.me CNAME → cname.vercel-dns.com" true
  else
    check "$sub.freno.me CNAME → cname.vercel-dns.com" false
  fi
done

echo ""
echo "=== HTTPS landing pages ==="
for sub in "${SUBDOMAINS[@]}"; do
  status=$(curl -sI -o /dev/null -w "%{http_code}" "https://${sub}.freno.me/" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    check "https://${sub}.freno.me/ → 200" true
  else
    check "https://${sub}.freno.me/ → 200 (got ${status})" false
  fi
done

echo ""
echo "=== Appcast regression (freno.me) ==="
for route in "${APICAST_ROUTES[@]}"; do
  status=$(curl -sI -o /dev/null -w "%{http_code}" "https://freno.me/api/${route}/appcast.xml" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    check "https://freno.me/api/${route}/appcast.xml → 200" true
  else
    check "https://freno.me/api/${route}/appcast.xml → 200 (got ${status})" false
  fi
done

echo ""
echo "=== Main site regression ==="
status=$(curl -sI -o /dev/null -w "%{http_code}" "https://freno.me/" 2>/dev/null || echo "000")
if [[ "$status" == "200" ]]; then
  check "https://freno.me/ → 200" true
else
  check "https://freno.me/ → 200 (got ${status})" false
fi

echo ""
echo "=== SSL certificates ==="
for sub in "${SUBDOMAINS[@]}"; do
  if echo | openssl s_client -connect "${sub}.freno.me:443" -servername "${sub}.freno.me" 2>/dev/null | \
     openssl x509 -noout -checkend 0 2>/dev/null | grep -q "not expired"; then
    check "${sub}.freno.me SSL valid" true
  else
    check "${sub}.freno.me SSL valid" false
  fi
done

echo ""
echo "=== Summary: ${PASS} passed, ${FAIL} failed ==="
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
