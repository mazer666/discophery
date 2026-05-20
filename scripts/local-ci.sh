#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Standardized output functions
log_running() {
    echo -e "${BLUE}[RUNNING]${NC} $1..."
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_failure() {
    echo -e "${RED}[FAILURE]${NC} $1"
}

# Ensure we exit on failure for critical commands
# We manage this manually to provide friendly failure logs

# Step 1: Dependency Security Audit (Critical)
log_running "Dependency Security Audit"
if npm audit --omit=dev; then
    log_success "No production vulnerabilities found."
else
    log_failure "Dependency Security Audit failed."
    exit 1
fi

# Step 2: TypeScript Typecheck (Critical)
log_running "TypeScript Typecheck"
if npx tsc --noEmit; then
    log_success "TypeScript typecheck passed."
else
    log_failure "TypeScript typecheck failed."
    exit 1
fi

# Step 3: Lint Check (Critical, if configured)
log_running "ESLint Linter"
# Check if eslint config exists or eslint is in devDependencies
if [ -f ".eslintrc" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ] || [ -f "eslint.config.js" ] || grep -q '"eslint"' package.json; then
    if npx eslint .; then
        log_success "ESLint linter passed."
    else
        log_failure "ESLint linter failed."
        exit 1
    fi
else
    log_warning "ESLint is not configured, skipping lint check."
fi

# Step 4: Formatting Check (Non-blocking warning)
log_running "Prettier Code Formatting Check"
# Check if prettier config exists or prettier is in devDependencies
if [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ] || [ -f ".prettierrc.js" ] || [ -f "prettier.config.js" ] || grep -q '"prettier"' package.json; then
    if npx prettier --check .; then
        log_success "Code formatting check passed."
    else
        log_warning "Code formatting check failed. Run 'npx prettier --write .' to fix."
    fi
else
    log_warning "Prettier is not configured, skipping formatting check."
fi

# Step 5: Unit Tests (Critical, if configured)
log_running "Unit Tests"
# Check if a non-placeholder test script is defined
if grep -q '"test":' package.json && ! grep -q '"test": "echo \\"Error: no test specified\\" && exit 1"' package.json; then
    if npm test; then
        log_success "Unit tests passed."
    else
        log_failure "Unit tests failed."
        exit 1
    fi
else
    log_warning "No unit test script configured, skipping unit tests."
fi

# Step 6: Production Build (Critical)
log_running "Production Build"
if npm run build; then
    log_success "Production build passed."
else
    log_failure "Production build failed."
    exit 1
fi

echo -e "\n${GREEN}=========================================${NC}"
log_success "All local CI quality gates passed successfully!"
echo -e "${GREEN}=========================================${NC}"
exit 0
