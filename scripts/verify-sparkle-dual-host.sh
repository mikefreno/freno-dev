#!/bin/bash
# Sparkle Appcast Dual-Host Verification Script
# 
# Verifies that Sparkle appcast and DMG endpoints work from both
# freno.me (legacy) and subdomain hosts (new)
#
# Usage: ./scripts/verify-sparkle-dual-host.sh [product]
#   product: Gaze | InputHalo | all (default: all)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://freno.me"
SUBDOMAINS=(
  "gaze:freno.me"
  "inputhalo:freno.me"
  "nessa:freno.me"
  "lineage:freno.me"
)

# Latest versions from appcast (update as needed)
LATEST_GAZE_VERSION="0.7.8"
LATEST_INPUTHALO_VERSION="0.5.2"

# Counters
PASS=0
FAIL=0
WARN=0

# Helper functions
log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASS++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAIL++))
}

log_warn() {
  echo -e "${YELLOW}! WARN${NC}: $1"
  ((WARN++))
}

log_info() {
  echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Check appcast endpoint
check_appcast() {
  local product=$1
  local host=$2
  local url="https://${host}/api/${product}/appcast.xml"
  
  log_info "Checking appcast for ${product} on ${host}..."
  
  # Test 1: HTTP status
  local status=$(curl -sI -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    log_pass "${product} appcast on ${host}: HTTP 200"
  else
    log_fail "${product} appcast on ${host}: HTTP ${status} (expected 200)"
    return 1
  fi
  
  # Test 2: Content-Type header
  local content_type=$(curl -sI "$url" 2>/dev/null | grep -i "content-type" | tr -d '\r' | awk '{print $2}')
  if [[ "$content_type" == *"application/xml"* ]]; then
    log_pass "${product} appcast on ${host}: Correct Content-Type"
  else
    log_fail "${product} appcast on ${host}: Wrong Content-Type: ${content_type}"
  fi
  
  # Test 3: Cache-Control header
  local cache_control=$(curl -sI "$url" 2>/dev/null | grep -i "cache-control" | tr -d '\r' | awk '{print $2}')
  if [[ "$cache_control" == *"max-age=300"* ]]; then
    log_pass "${product} appcast on ${host}: Correct Cache-Control"
  else
    log_fail "${product} appcast on ${host}: Wrong Cache-Control: ${cache_control}"
  fi
  
  # Test 4: CORS header
  local cors=$(curl -sI "$url" 2>/dev/null | grep -i "access-control-allow-origin" | tr -d '\r' | awk '{print $2}')
  if [ "$cors" = "*" ]; then
    log_pass "${product} appcast on ${host}: CORS header present"
  else
    log_fail "${product} appcast on ${host}: Missing CORS header"
  fi
  
  # Test 5: Valid XML
  local xml=$(curl -s "$url" 2>/dev/null)
  if echo "$xml" | xmllint --noout - 2>/dev/null; then
    log_pass "${product} appcast on ${host}: Valid XML"
  else
    log_fail "${product} appcast on ${host}: Invalid XML"
  fi
  
  # Test 6: Check for absolute enclosure URLs
  if echo "$xml" | grep -q 'enclosure url="https://freno\.me/api/downloads/'; then
    log_pass "${product} appcast on ${host}: Uses absolute freno.me enclosure URLs"
  else
    log_fail "${product} appcast on ${host}: Missing absolute enclosure URLs"
  fi
  
  echo ""
}

# Compare appcast between hosts
compare_appcast() {
  local product=$1
  local base_host="freno.me"
  local subdomain_host=$2
  
  log_info "Comparing ${product} appcast between ${base_host} and ${subdomain_host}..."
  
  local base_xml=$(curl -s "https://${base_host}/api/${product}/appcast.xml" 2>/dev/null)
  local subdomain_xml=$(curl -s "https://${subdomain_host}/api/${product}/appcast.xml" 2>/dev/null)
  
  if [ "$base_xml" = "$subdomain_xml" ]; then
    log_pass "${product} appcast: Byte-identical between ${base_host} and ${subdomain_host}"
  else
    log_fail "${product} appcast: Content differs between ${base_host} and ${subdomain_host}"
    echo "$base_xml" > /tmp/base-appcast.xml
    echo "$subdomain_xml" > /tmp/subdomain-appcast.xml
    echo "Differences saved to /tmp/base-appcast.xml and /tmp/subdomain-appcast.xml"
  fi
  
  echo ""
}

# Check DMG download endpoint
check_dmg_download() {
  local product=$1
  local host=$2
  local version=$3
  local filename="${product}-${version}.dmg"
  local url="https://${host}/api/downloads/${filename}"
  
  log_info "Checking DMG download for ${product} on ${host} (${filename})..."
  
  # Test HTTP status (just head request for speed)
  local status=$(curl -sI -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    log_pass "${product} DMG on ${host}: HTTP 200"
  else
    log_fail "${product} DMG on ${host}: HTTP ${status} (expected 200)"
  fi
  
  # Test Content-Type
  local content_type=$(curl -sI "$url" 2>/dev/null | grep -i "content-type" | tr -d '\r' | awk '{print $2}')
  if [[ "$content_type" == *"apple-diskimage"* ]] || [[ "$content_type" == *"octet-stream"* ]]; then
    log_pass "${product} DMG on ${host}: Correct Content-Type"
  else
    log_fail "${product} DMG on ${host}: Wrong Content-Type: ${content_type}"
  fi
  
  echo ""
}

# Main verification
main() {
  local product=${1:-"all"}
  
  echo "========================================="
  echo "Sparkle Appcast Dual-Host Verification"
  echo "========================================="
  echo ""
  echo "Base URL: ${BASE_URL}"
  echo "Product: ${product}"
  echo "Date: $(date)"
  echo ""
  echo "-----------------------------------------"
  echo "1. Checking Appcast Endpoints"
  echo "-----------------------------------------"
  echo ""
  
  # Check Gaze appcast on all relevant hosts
  if [ "$product" = "all" ] || [ "$product" = "Gaze" ]; then
    check_appcast "Gaze" "freno.me"
    check_appcast "Gaze" "gaze.freno.me"
    compare_appcast "Gaze" "gaze.freno.me"
  fi
  
  # Check InputHalo appcast on all relevant hosts
  if [ "$product" = "all" ] || [ "$product" = "InputHalo" ]; then
    check_appcast "InputHalo" "freno.me"
    check_appcast "InputHalo" "inputhalo.freno.me"
    compare_appcast "InputHalo" "inputhalo.freno.me"
  fi
  
  echo "-----------------------------------------"
  echo "2. Checking DMG Download Endpoints"
  echo "-----------------------------------------"
  echo ""
  
  # Check all subdomain hosts for DMG downloads
  for subdomain_entry in "${SUBDOMAINS[@]}"; do
    local subdomain_host="${subdomain_entry//:/}"
    subdomain_host="${subdomain_host//:/}.freno.me"
    
    if [ "$product" = "all" ] || [ "$product" = "Gaze" ]; then
      check_dmg_download "Gaze" "$subdomain_host" "$LATEST_GAZE_VERSION"
    fi
    
    if [ "$product" = "all" ] || [ "$product" = "InputHalo" ]; then
      check_dmg_download "InputHalo" "$subdomain_host" "$LATEST_INPUTHALO_VERSION"
    fi
  done
  
  echo "-----------------------------------------"
  echo "3. Checking vercel.json Rewrite Ordering"
  echo "-----------------------------------------"
  echo ""
  
  # Check that /api/* pass-throughs come before catch-all rewrites
  local api_rewrites=$(grep -n "source.*api" vercel.json | head -4 | wc -l)
  local catchall_rewrites=$(grep -n "source.*\(.*)$" vercel.json | grep -v "api" | wc -l)
  
  if [ "$api_rewrites" -eq 4 ]; then
    log_pass "Found ${api_rewrites} /api/* pass-through rules"
  else
    log_fail "Expected 4 /api/* pass-through rules, found ${api_rewrites}"
  fi
  
  if [ "$catchall_rewrites" -eq 4 ]; then
    log_pass "Found ${catchall_rewrites} catch-all subdomain rewrite rules"
  else
    log_fail "Expected 4 catch-all subdomain rewrite rules, found ${catchall_rewrites}"
  fi
  
  echo ""
  echo "-----------------------------------------"
  echo "4. Summary"
  echo "-----------------------------------------"
  echo ""
  echo -e "  ${GREEN}PASSED: ${PASS}${NC}"
  echo -e "  ${RED}FAILED: ${FAIL}${NC}"
  echo -e "  ${YELLOW}WARNED: ${WARN}${NC}"
  echo ""
  
  if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Dual-host support is working correctly.${NC}"
    return 0
  else
    echo -e "${RED}Some checks failed. Please review the output above.${NC}"
    return 1
  fi
}

# Run main
main "$@"
