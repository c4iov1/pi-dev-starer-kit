#!/usr/bin/env bash
# init-starter-kit — Copy Pi.dev Starter Kit templates to a new project.
#
# Usage:
#   ./init-starter-kit.sh [project-name] [stack]
#
# Examples:
#   ./init-starter-kit.sh my-app "TypeScript/Next.js"
#   ./init-starter-kit.sh my-api "Python/FastAPI"
#
# This script assumes the templates/ directory is relative to the script location
# (i.e., run from the pi-dev-starter-kit repo root).

set -euo pipefail

PROJECT_NAME="${1:-}"
STACK="${2:-TypeScript/Node.js}"

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: $0 <project-name> [stack]"
  echo "Example: $0 my-app 'TypeScript/Next.js'"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
  echo "Error: templates/ directory not found at $TEMPLATES_DIR"
  echo "Run this script from the pi-dev-starter-kit repo root."
  exit 1
fi

echo "==> Pi.dev Starter Kit — Project Initialization"
echo "    Project: $PROJECT_NAME"
echo "    Stack:   $STACK"
echo ""

# ── Create directory structure ─────────────────────────────────────

mkdir -p docs/adr
mkdir -p docs/references
mkdir -p docs/explorations
mkdir -p .pi/extensions
mkdir -p .pi/skills
mkdir -p .pi/prompts

# ── Copy templates ─────────────────────────────────────────────────

echo "Copying templates..."

cp "$TEMPLATES_DIR/AGENTS.template.md"     "./AGENTS.md"
cp "$TEMPLATES_DIR/CONTEXT.template.md"    "./CONTEXT.md"
cp "$TEMPLATES_DIR/settings.template.json" "./.pi/settings.json"
cp "$TEMPLATES_DIR/INDEX.template.md"      "./docs/INDEX.md"
cp "$TEMPLATES_DIR/ADR.template.md" "docs/adr/0001-template.md"

echo "  ✓ AGENTS.md"
echo "  ✓ CONTEXT.md"
echo "  ✓ .pi/settings.json"
echo "  ✓ docs/INDEX.md"
echo "  ✓ docs/adr/"
echo "  ✓ docs/references/"
echo "  ✓ docs/explorations/"
echo "  ✓ .pi/extensions/"
echo "  ✓ .pi/skills/"
echo "  ✓ .pi/prompts/"

# ── Seed AGENTS.md ─────────────────────────────────────────────────

# Replace placeholders with actual values
ESCAPED_NAME=$(printf '%s' "$PROJECT_NAME" | sed 's/[&/\]/\\&/g')
ESCAPED_STACK=$(printf '%s' "$STACK" | sed 's/[&/\]/\\&/g')

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\[PROJECT_NAME\]/$ESCAPED_NAME/g" "./AGENTS.md"
  sed -i '' "s/\[PROJECT_NAME\]/$ESCAPED_NAME/g" "./CONTEXT.md"
  sed -i '' "s/\[PROJECT_NAME\]/$ESCAPED_NAME/g" "./docs/INDEX.md"
else
  sed -i "s/\[PROJECT_NAME\]/$ESCAPED_NAME/g" "./AGENTS.md"
  sed -i "s/\[PROJECT_NAME\]/$ESCAPED_NAME/g" "./CONTEXT.md"
  sed -i "s/\[PROJECT_NAME\]/$ESCAPED_NAME/g" "./docs/INDEX.md"
fi

echo ""
echo "==> Done! Next steps:"
echo ""
echo "  1. Edit AGENTS.md — fill in directory structure, stack, and commands"
echo "  2. Edit CONTEXT.md — add your domain glossary terms"
echo "  3. Review .pi/settings.json — enable/disable extensions and skills"
echo "  4. Start pi and run: /setup-matt-pocock-skills"
echo "  5. Start coding with: pi"
