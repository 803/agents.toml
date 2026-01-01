#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Ensure working directory is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Run tests before release
echo "Running tests..."
npm run test:run

# Run build to ensure it works
echo "Building..."
npm run build

# Bump version (updates package.json, no git tag)
npm version "$@" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")

# Commit and tag
git add .
git commit -m "release: v$VERSION"
git tag "v$VERSION"

echo ""
echo "Pushing v$VERSION..."
git push && git push --tags
