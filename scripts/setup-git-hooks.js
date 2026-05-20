import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const gitDir = path.join(rootDir, '.git');
const hooksDir = path.join(gitDir, 'hooks');
const hookFile = path.join(hooksDir, 'pre-push');

console.log('Running automatic Git hook installer...');

// Gracefully handle cases where .git is not initialized (e.g., CI or container builds)
if (!fs.existsSync(gitDir)) {
  console.warn('[WARNING] .git directory not found. Skipping Git hook installation (this is expected in CI, container, or package deployment builds).');
  process.exit(0);
}

// Ensure hooks directory exists
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

// Write pre-push hook script content
const hookContent = `#!/bin/sh
# Git pre-push hook created by setup-git-hooks.js
# Intercepts pushes to execute the local CI pipeline

echo "=================================================="
echo "      Running Local CI Quality Gate Pipeline      "
echo "=================================================="

# Run local CI quality gate script
npm run local-ci

# Capture the exit code of local-ci
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ [FAILURE] Local CI Quality Gates failed. Git push aborted."
  echo "Please fix the errors above and try again."
  echo "=================================================="
  exit $EXIT_CODE
fi

echo "=================================================="
echo "🟢 [SUCCESS] All local CI checks passed. Pushing..."
echo "=================================================="
exit 0
`;

try {
  fs.writeFileSync(hookFile, hookContent, { encoding: 'utf8', mode: 0o755 });
  // Ensure execute permissions (0755 = 493 decimal)
  fs.chmodSync(hookFile, 0o755);
  console.log(`[SUCCESS] Programmatically installed pre-push hook at: ${hookFile}`);
} catch (error) {
  console.error(`[FAILURE] Failed to install pre-push hook: ${error.message}`);
  process.exit(1);
}
