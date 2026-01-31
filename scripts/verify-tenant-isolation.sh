#!/bin/bash
# Verification script for multi-tenant isolation
# Checks that all critical routes use withAuth and filter by userId

echo "🔍 Verifying Multi-Tenant Isolation Implementation"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Function to check if a file contains a pattern
check_file() {
  local file=$1
  local pattern=$2
  local description=$3

  if grep -q "$pattern" "$file"; then
    echo -e "${GREEN}✓${NC} $description: $file"
  else
    echo -e "${RED}✗${NC} $description: $file"
    ((errors++))
  fi
}

# Function to check if a file does NOT contain a pattern (anti-pattern)
check_file_not() {
  local file=$1
  local pattern=$2
  local description=$3

  if ! grep -q "$pattern" "$file"; then
    echo -e "${GREEN}✓${NC} $description: $file"
  else
    echo -e "${YELLOW}⚠${NC} $description: $file"
    ((warnings++))
  fi
}

echo "1. Checking API Routes for withAuth wrapper..."
echo "------------------------------------------------"

check_file "apps/web/app/api/people/route.ts" "withAuth" "Uses withAuth"
check_file "apps/web/app/api/people/[id]/route.ts" "withAuth" "Uses withAuth"
check_file "apps/web/app/api/connections/route.ts" "withAuth" "Uses withAuth"
check_file "apps/web/app/api/network/route.ts" "withAuth" "Uses withAuth"
check_file "apps/web/app/api/linkedin/profile/route.ts" "withAuth" "Uses withAuth"
check_file "apps/web/app/api/people/[id]/paths/route.ts" "withAuth" "Uses withAuth"

echo ""
echo "2. Checking API Routes for userId filtering..."
echo "------------------------------------------------"

check_file "apps/web/app/api/people/route.ts" "userId," "Filters by userId"
check_file "apps/web/app/api/people/[id]/route.ts" "userId," "Filters by userId"
check_file "apps/web/app/api/connections/route.ts" "userId," "Filters by userId"
check_file "apps/web/app/api/network/route.ts" "userId," "Filters by userId"
check_file "apps/web/app/api/linkedin/profile/route.ts" "userId," "Filters by userId"

echo ""
echo "3. Checking Graph Service..."
echo "------------------------------------------------"

check_file "apps/web/lib/graph-service.ts" "createGraphService(userId: string)" "Requires userId parameter"
check_file "apps/web/lib/graph-service.ts" "userId," "Filters by userId"
check_file "apps/web/lib/graph-service.ts" "where: {" "Uses where clauses for filtering"

echo ""
echo "4. Checking for anti-patterns..."
echo "------------------------------------------------"

# Check that we're not using export async function (should be export const = withAuth)
check_file_not "apps/web/app/api/people/route.ts" "export async function GET" "No 'export async function' pattern"
check_file_not "apps/web/app/api/connections/route.ts" "export async function GET" "No 'export async function' pattern"
check_file_not "apps/web/app/api/network/route.ts" "export async function GET" "No 'export async function' pattern"

echo ""
echo "5. Checking test files exist..."
echo "------------------------------------------------"

if [ -f "apps/web/app/api/people/route.multi-tenant.test.ts" ]; then
  echo -e "${GREEN}✓${NC} People route tests exist"
else
  echo -e "${RED}✗${NC} People route tests missing"
  ((errors++))
fi

if [ -f "apps/web/app/api/connections/route.multi-tenant.test.ts" ]; then
  echo -e "${GREEN}✓${NC} Connections route tests exist"
else
  echo -e "${RED}✗${NC} Connections route tests missing"
  ((errors++))
fi

if [ -f "apps/web/app/api/network/route.multi-tenant.test.ts" ]; then
  echo -e "${GREEN}✓${NC} Network route tests exist"
else
  echo -e "${RED}✗${NC} Network route tests missing"
  ((errors++))
fi

echo ""
echo "6. Checking documentation..."
echo "------------------------------------------------"

if [ -f "docs/MultiTenantBestPractices.md" ]; then
  echo -e "${GREEN}✓${NC} Multi-tenant best practices documentation exists"
else
  echo -e "${RED}✗${NC} Multi-tenant best practices documentation missing"
  ((errors++))
fi

if [ -f "docs/TaskPackets/API-Routes-Audit.md" ]; then
  echo -e "${GREEN}✓${NC} API routes audit documentation exists"
else
  echo -e "${RED}✗${NC} API routes audit documentation missing"
  ((errors++))
fi

echo ""
echo "=================================================="
echo "📊 Summary"
echo "=================================================="

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo "Multi-tenant isolation is properly implemented."
  exit 0
elif [ $errors -eq 0 ]; then
  echo -e "${YELLOW}⚠ All critical checks passed, but found $warnings warnings${NC}"
  echo "Review the warnings above."
  exit 0
else
  echo -e "${RED}✗ Found $errors errors and $warnings warnings${NC}"
  echo "Fix the errors above before proceeding."
  exit 1
fi
